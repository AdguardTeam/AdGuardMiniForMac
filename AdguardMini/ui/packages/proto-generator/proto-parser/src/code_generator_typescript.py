import constants
import os
import logging

from code_generator_abstract_language import CodeGeneratorAbstract

logger = logging.getLogger(__name__)


class CodeGeneratorTypeScript(CodeGeneratorAbstract):
    def get_service_output_subdir(self, file_type, service_postfix):
        if file_type != constants.TYPE_CALLBACKS:
            return None
        return self.converter.seed_dirs.get(service_postfix)

    def should_skip_service_postfix(self, file_type, output_name, service_postfix):
        if file_type != constants.TYPE_CALLBACKS:
            return False

        output_subdir = self.converter.seed_dirs.get(service_postfix)
        if output_subdir is None:
            return False

        converted_path = self.converter.get_converted_path(output_name, file_type, output_subdir)
        if os.path.isfile(converted_path):
            logger.info("Skip existing implementation file %s", converted_path)
            return True

        return False

    def get_request_output_name(self, service_name, method_name, service_postfix):
        return os.path.join(service_name, f"{method_name}Request{service_postfix}")

    def get_super_filename(self, file_type):
        return "index"

    def should_skip_primary_generation(self, file_type):
        return file_type == constants.TYPE_SERVICES

    def handle_skipped_primary_generation(self, file_type, dir_input, proto_file_names):
        if file_type != constants.TYPE_SERVICES:
            return []

        logger.info("Skipping service generation for TypeScript, using requests instead")
        request_names = []
        for proto_file_name in proto_file_names:
            full_proto_file_path = os.path.join(dir_input, proto_file_name)
            _, names = self.generate_request(constants.TYPE_REQUESTS, full_proto_file_path)
            request_names.extend(names)

        return request_names

    def generate_requests_indexes(self, request_names):
        requests_by_service = {}
        for request_name in request_names:
            service_name = os.path.dirname(request_name)
            request_class_name = os.path.basename(request_name)

            if not service_name or not request_class_name:
                continue

            requests_by_service.setdefault(service_name, []).append(request_class_name)

        for service_name, service_requests in requests_by_service.items():
            content_lines = [f"export * from './{request_class_name}';" for request_class_name in sorted(set(service_requests))]
            index_content = "\n".join(content_lines) + "\n"
            self.converter.save_converted(index_content, os.path.join(service_name, "index"), constants.TYPE_REQUESTS)

    def should_generate_super_types(self, file_type):
        return file_type == constants.TYPE_TYPES
