from abc import abstractmethod
import helper
import os
import constants
import jinja2
import json
import logging

logger = logging.getLogger(__name__)

class ConverterAbstract(object):
    """Abstract language converter .proto file with rpc methods"""
    def __init__(self, language_name):
        """Initializes the abstract language converter"""
        self.language_name_ = language_name
        self.service_postfixes = [""]

    def parse_config(self):
        """Parses configuration file if exists"""
        self.config_path_  = os.path.join(constants.DIR_CONFIGS, f"{self.language_name_}.json")
        self.config_ = json.loads(helper.read_file(self.config_path_))

        if "input_dir" in self.config_ and self.config_["input_dir"]:
            self.input_dir_path = self.config_["input_dir"]
        else:
            self.input_dir_path = constants.DIR_INPUT

        if not os.path.exists(self.input_dir_path) or not os.path.isdir(self.input_dir_path):
            raise FileNotFoundError(f"Input directory {self.input_dir_path} doesn't exist")

        if "output_dir" in self.config_ and self.config_["output_dir"]:
            self.output_dir_path = self.config_["output_dir"]
        else:
            postfix=self.language_name_
            if "omit_lang_postfix_in_output_path" in self.config_ and self.config_["omit_lang_postfix_in_output_path"]:
                postfix=""

            self.output_dir_path = os.path.join(constants.DIR_OUTPUT, postfix)

        if "service_postfixes" in self.config_ and self.config_["service_postfixes"]:
            self.service_postfixes = self.config_["service_postfixes"]

        if not os.path.exists(self.output_dir_path) or not os.path.isdir(self.output_dir_path):
            # Create any missing intermediate directories: the output path can
            # be nested (e.g. `<pkg>/samples/output`), which `os.mkdir` would
            # fail on.
            os.makedirs(self.output_dir_path, exist_ok=True)

    def get_service_converted(self, file_type, service, service_postfix, method=None):
        """Gets converted result from the specified parser result as a string"""
        template_loader = jinja2.FileSystemLoader(constants.DIR_TEMPLATES)
        template_env = jinja2.Environment(
            loader=template_loader,
            extensions=['jinja2.ext.do'],
            trim_blocks=True)
        template_env.globals['helper'] = helper
        template_env.globals['constants'] = constants
        template_env.globals['config'] = self.config_
        jinja_template_filename = f'{file_type}_{self.language_name_}{service_postfix}.j2'
        full_jinja_template_filename = os.path.join(constants.DIR_TEMPLATES, jinja_template_filename)
        if not os.path.exists(full_jinja_template_filename) or not os.path.isfile(full_jinja_template_filename):
            logger.info("Cannot find jinja template %s", full_jinja_template_filename)
            return
        template = template_env.get_template(jinja_template_filename)
        content = template.render(
            service=service,
            method=method)
        return content

    def get_super_type_converted(self, file_type, super_proto_names):
        """Gets converted result from the specified parser result as a string"""
        template_loader = jinja2.FileSystemLoader(constants.DIR_TEMPLATES)
        template_env = jinja2.Environment(
            loader=template_loader,
            extensions=['jinja2.ext.do'],
            trim_blocks=True)
        template_env.globals['helper'] = helper
        template_env.globals['constants'] = constants
        template_env.globals['config'] = self.config_
        jinja_template_filename = f'super_{file_type}_{self.language_name_}.j2'
        full_jinja_template_filename = os.path.join(constants.DIR_TEMPLATES, jinja_template_filename)
        if not os.path.exists(full_jinja_template_filename) or not os.path.isfile(full_jinja_template_filename):
            logger.info("Cannot find jinja template %s", full_jinja_template_filename)
            return
        template = template_env.get_template(jinja_template_filename)
        content = template.render(
            types=super_proto_names)
        return content

    @abstractmethod
    def get_protoc_command(self, full_proto_file_path):
        """Gets the protoc command"""
        return

    def get_converted_path(self, name, file_type):
        """Gets the path to converted file with the specified name"""
        language_file_extension = constants.SUPPORTED_LANGUAGES_PARAMETERS[self.language_name_][f'extension_{file_type}']
        converted_dir_path = os.path.join(
            self.output_dir_path,
            file_type)

        helper.create_dir(converted_dir_path)
        converted_path = os.path.join(
            converted_dir_path,
            f"{name}{language_file_extension}")
        converted_dirname = os.path.dirname(converted_path)
        if converted_dirname:
            helper.create_dir(converted_dirname)
        return converted_path

    def save_converted(self, converted, name, file_type):
        """Saves converted model, rpc service to the file with the specified name"""
        converted_path = self.get_converted_path(name, file_type)
        # Normalize to a single trailing newline so regenerated files stay
        # POSIX-conformant and diff-clean (a jinja template can otherwise
        # drop the final newline under trim_blocks).
        stripped = converted.rstrip()
        content = f"{stripped}\n" if stripped else ""
        helper.save_to_file(content, converted_path)

    def get_content(self, content_list):
        """Gets the content as a string from the specified list"""
        return '\r\n'.join(content_list)

    def post_process_service(self, content):
        """Hooks for custom post-processing generated services for concrete language"""
        return content

    def post_process_model(self, content, full_proto_file_path):
        """Hooks for custom post-processing generated models for concrete language"""
        return content
