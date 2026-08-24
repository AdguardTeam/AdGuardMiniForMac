import constants
import helper
import proto_parser
import validator
import parser_helper
import os
import logging
from converter_swift import SwiftConverter
from converter_typescript import ConverterTypescript

logger = logging.getLogger(__name__)

LANGUAGES_CONVERTERS_MAP = {
    constants.LANGUAGE_SWIFT : SwiftConverter(),
    constants.LANGUAGE_TYPESCRIPT : ConverterTypescript(),
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

    def parse_proto(self, full_proto_file_path):
        """Parses proto file and returns parser result"""
        proto_content = helper.read_file(full_proto_file_path)
        parser_result = proto_parser.proto.parse(proto_content)
        validator.validate_parser_result(parser_result)
        parser_helper.prepare_parser_result(parser_result)
        return parser_result

    def should_skip_service_postfix(self, file_type, output_name, service_postfix):
        return False

    def get_request_output_name(self, service_name, method_name, service_postfix):
        return f"{method_name}Request{service_postfix}"

    def get_super_filename(self, file_type):
        return f"super_{file_type}"

    def generate_requests_indexes(self, request_names):
        return

    def should_skip_primary_generation(self, file_type):
        return False

    def handle_skipped_primary_generation(self, file_type, dir_input):
        return []

    def should_generate_super_types(self, file_type):
        return True

    def generate_service(self, file_type, full_proto_file_path):
        """Generates service file according to the passed programming language"""
        parser_result = self.parse_proto(full_proto_file_path)
        concatenated_converted_content = ""
        services = list(filter(lambda s: isinstance(s, proto_parser.DescribedObject), parser_result.statements))
        base_output_name = os.path.splitext(os.path.basename(full_proto_file_path))[0]

        if not services:
            logger.info("No service found in %s, skipping", full_proto_file_path)
            return None

        for service_postfix in self.converter.service_postfixes:
            output_name = f"{base_output_name}{service_postfix}"
            if self.should_skip_service_postfix(file_type, output_name, service_postfix):
                continue

            converted_content = self.converter.get_service_converted(file_type, services[0], service_postfix)

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
                file_type
            )

            concatenated_converted_content += converted_content

        return self.converter.post_process_service(concatenated_converted_content)

    def generate_request(self, file_type, full_proto_file_path):
        """Generates request file according to the passed programming language"""
        parser_result = self.parse_proto(full_proto_file_path)
        concatenated_converted_content = ""
        generated_names = []
        services = list(filter(lambda s: isinstance(s, proto_parser.DescribedObject), parser_result.statements))

        for service in services:
            service_name = service.body.name

            for method in service.body.body:
                for service_postfix in self.converter.service_postfixes:
                    converted_content = self.converter.get_service_converted(file_type, service, service_postfix, method)

                    if converted_content is None:
                        logger.info("No template found for %s%s, skipping %s", file_type, service_postfix, full_proto_file_path)
                        continue

                    output_name = self.get_request_output_name(service_name, method.body.name, service_postfix)

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

    def generate(self, file_type):
        """Generates file_type files according to the passed programming language"""
        super_proto_names = []
        self.converter.parse_config()
        dir_input = os.path.join(self.converter.input_dir_path, file_type)

        if not os.path.exists(dir_input) or not os.path.isdir(dir_input):
            raise FileNotFoundError(f"Input directory {dir_input} doesn't exist")

        request_names = []
        action_name = self.FILE_TYPE_ACTIONS_MAP[file_type]
        if action_name and not self.should_skip_primary_generation(file_type):
            file_type_action = getattr(self, action_name)
            for proto_file in os.listdir(dir_input):
                if not proto_file.endswith(".proto"):
                    logger.info("File %s is not a proto file, ignore it", proto_file)
                    continue

                full_proto_file_path = os.path.join(dir_input, proto_file)
                converted_file_name = helper.get_file_name(full_proto_file_path)
                # `generate_request` returns `(content, request_names)`; the
                # other generators return content only. Unpack so the
                # accumulated request names reach `generate_requests_indexes`.
                result = file_type_action(file_type, full_proto_file_path)
                if isinstance(result, tuple):
                    converted_content, generated_names = result
                    request_names.extend(generated_names)
                else:
                    converted_content = result
                super_proto_names.append(converted_file_name)

                if converted_content is None:
                    logger.info(
                        "No need to generate %s proto file from %s for %s language",
                        file_type,
                        proto_file,
                        self.language
                    )
                    continue
        elif action_name:
            request_names = self.handle_skipped_primary_generation(file_type, dir_input)

        if request_names:
            self.generate_requests_indexes(request_names)

        post_action_name = self.FILE_TYPE_POST_ACTIONS_MAP[file_type]
        if post_action_name:
            file_type_post_action = getattr(self, post_action_name)
            for proto_file in os.listdir(dir_input):
                if not proto_file.endswith(".proto"):
                    logger.info("File %s is not a proto file, ignore it", proto_file)
                    continue

                full_proto_file_path = os.path.join(dir_input, proto_file)
                post_processed_content = file_type_post_action(file_type, full_proto_file_path)
                if post_processed_content is None:
                    logger.info(
                        "No need to post process %s proto file from %s for %s language",
                        file_type,
                        proto_file,
                        self.language
                    )

        if not self.should_generate_super_types(file_type):
            return

        converted_super_content = self.generate_super_types(file_type, super_proto_names)
        if converted_super_content is None:
            logger.info(
                "No need to generate %s super-proto file for %s language",
                file_type,
                self.language
            )


def generate(language, file_type):
    """Generates file_type files according to the passed programming language"""
    converter = LANGUAGES_CONVERTERS_MAP[language]
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