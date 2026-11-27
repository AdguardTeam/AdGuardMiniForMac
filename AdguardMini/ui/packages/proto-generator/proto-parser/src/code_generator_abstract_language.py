import constants
import helper
import proto_descriptor
import os
import logging
from converter_swift import SwiftConverter
from converter_typescript import ConverterTypescript

logger = logging.getLogger(__name__)

LANGUAGES_CONVERTER_CLASSES = {
    constants.LANGUAGE_SWIFT : SwiftConverter,
    constants.LANGUAGE_TYPESCRIPT : ConverterTypescript,
}

class CodeGeneratorAbstract(object):
    """Base code generation pipeline with extension hooks for language specifics."""

    FILE_TYPE_ACTIONS_MAP = {
        constants.TYPE_SERVICES : "generate_service",
        constants.TYPE_TYPES : "generate_model",
        constants.TYPE_CALLBACKS : "generate_service",
        constants.TYPE_REQUESTS : "generate_request"
    }

    FILE_TYPE_POST_ACTIONS_MAP = {
        constants.TYPE_SERVICES : None,
        constants.TYPE_TYPES : "post_process_model",
        constants.TYPE_CALLBACKS : None,
        constants.TYPE_REQUESTS : None
    }

    def __init__(self, converter, language):
        self.converter = converter
        self.language = language

    def read_service(self, full_proto_file_path):
        """Gets the single service the proto file declares"""
        return proto_descriptor.load(self.converter.input_dir_path).service(full_proto_file_path)

    def should_skip_service_postfix(self, file_type, output_name, service_postfix):
        return False

    def get_service_output_subdir(self, file_type, service_postfix):
        """Returns the output subdirectory for a service file, or None for the file-type directory."""
        return None

    def get_request_output_name(self, service_name, method_name, service_postfix):
        return f"{method_name}Request{service_postfix}"

    def get_super_filename(self, file_type):
        return f"super_{file_type}"

    def generate_requests_indexes(self, request_names):
        return

    def should_skip_primary_generation(self, file_type):
        return False

    def handle_skipped_primary_generation(self, file_type, dir_input, proto_file_names):
        return []

    def should_generate_super_types(self, file_type):
        return True

    def generate_service(self, file_type, full_proto_file_path):
        """Generates service file according to the passed programming language"""
        service = self.read_service(full_proto_file_path)
        concatenated_converted_content = ""
        base_output_name = os.path.splitext(os.path.basename(full_proto_file_path))[0]

        for service_postfix in self.converter.service_postfixes:
            output_name = f"{base_output_name}{service_postfix}"
            if self.should_skip_service_postfix(file_type, output_name, service_postfix):
                continue

            converted_content = self.converter.get_service_converted(file_type, service, service_postfix)

            if converted_content is None:
                logger.info(
                    "No template found for %s%s, skipping %s",
                    file_type,
                    service_postfix,
                    full_proto_file_path
                )
                continue

            self.converter.save_converted(
                converted_content,
                output_name,
                file_type,
                self.get_service_output_subdir(file_type, service_postfix)
            )

            concatenated_converted_content += converted_content

        return self.converter.post_process_service(concatenated_converted_content)

    def generate_request(self, file_type, full_proto_file_path):
        """Generates request file according to the passed programming language"""
        service = self.read_service(full_proto_file_path)
        concatenated_converted_content = ""
        generated_names = []

        for method in service.methods:
            for service_postfix in self.converter.service_postfixes:
                converted_content = self.converter.get_service_converted(file_type, service, service_postfix, method)

                if converted_content is None:
                    logger.info("No template found for %s%s, skipping %s", file_type, service_postfix, full_proto_file_path)
                    continue

                output_name = self.get_request_output_name(service.name, method.name, service_postfix)

                self.converter.save_converted(
                    converted_content,
                    output_name,
                    file_type
                )

                generated_names.append(output_name)
                concatenated_converted_content += converted_content

        if not concatenated_converted_content:
            return None, []

        return self.converter.post_process_service(concatenated_converted_content), generated_names

    def generate_model(self, file_type, full_proto_file_path):
        """Generate model file according to the passed programming language"""
        protoc_command = self.converter.get_protoc_command(full_proto_file_path)
        if protoc_command is None:
            return

        helper.start_command(protoc_command)
        converted_file_name = helper.get_file_name(full_proto_file_path)
        converted_path = self.converter.get_converted_path(converted_file_name, file_type)
        converted_content = helper.read_file(converted_path)
        return converted_content

    def post_process_model(self, file_type, full_proto_file_path):
        """Post processes generated models according to the passed programming language"""
        converted_file_name = helper.get_file_name(full_proto_file_path)
        converted_path = self.converter.get_converted_path(converted_file_name, file_type)
        converted_content = helper.read_file(converted_path)
        if not converted_content:
            logging.info("Cannot find file %s", converted_path)
            return

        post_processed_content = self.converter.post_process_model(converted_content, full_proto_file_path)
        if converted_content is not post_processed_content:
            helper.save_to_file(post_processed_content, converted_path)
        return post_processed_content

    def generate_super_types(self, file_type, super_proto_paths):
        """Generates super types file according to the passed programming language"""
        converted_content = self.converter.get_super_type_converted(file_type, super_proto_paths)
        if converted_content is None:
            return

        self.converter.save_converted(
            converted_content,
            self.get_super_filename(file_type),
            file_type
        )

        return converted_content

    def generate_files(self, file_type, dir_input, proto_file_names):
        """Generates and post-processes one output file per proto file"""
        file_type_action = getattr(self, self.FILE_TYPE_ACTIONS_MAP[file_type])
        post_action_name = self.FILE_TYPE_POST_ACTIONS_MAP[file_type]
        request_names = []

        for proto_file_name in proto_file_names:
            full_proto_file_path = os.path.join(dir_input, proto_file_name)
            result = file_type_action(file_type, full_proto_file_path)

            # `generate_request` returns `(content, request_names)`; the others return content.
            if isinstance(result, tuple):
                converted_content, generated_names = result
                request_names.extend(generated_names)
            else:
                converted_content = result

            if post_action_name:
                getattr(self, post_action_name)(file_type, full_proto_file_path)

            if converted_content is None:
                logger.info(
                    "No need to generate %s proto file from %s for %s language",
                    file_type,
                    proto_file_name,
                    self.language
                )

        return request_names

    def generate(self, file_type):
        """Generates file_type files according to the passed programming language"""
        self.converter.parse_config()
        dir_input = os.path.join(self.converter.input_dir_path, file_type)

        if not os.path.exists(dir_input) or not os.path.isdir(dir_input):
            raise FileNotFoundError(f"Input directory {dir_input} doesn't exist")

        proto_file_names = sorted(name for name in os.listdir(dir_input) if name.endswith(".proto"))

        if self.should_skip_primary_generation(file_type):
            request_names = self.handle_skipped_primary_generation(file_type, dir_input, proto_file_names)
        else:
            request_names = self.generate_files(file_type, dir_input, proto_file_names)

        if request_names:
            self.generate_requests_indexes(request_names)

        if not self.should_generate_super_types(file_type):
            return

        super_proto_names = [helper.get_file_name(name) for name in proto_file_names]
        converted_super_content = self.generate_super_types(file_type, super_proto_names)
        if converted_super_content is None:
            logger.info(
                "No need to generate %s super-proto file for %s language",
                file_type,
                self.language
            )


def generate(language, input_dir, output_dir, file_type):
    """Generates file_type files according to the passed programming language"""
    converter = LANGUAGES_CONVERTER_CLASSES[language](language, input_dir, output_dir)
    if language == constants.LANGUAGE_TYPESCRIPT:
        # Deferred import avoids a circular dependency: code_generator_typescript
        # imports this module, so it must be fully initialized before we can
        # reference CodeGeneratorTypeScript here.
        from code_generator_typescript import CodeGeneratorTypeScript
        generator_type = CodeGeneratorTypeScript
    else:
        generator_type = CodeGeneratorAbstract
    generator = generator_type(converter, language)
    generator.generate(file_type)