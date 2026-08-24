import constants
import os
import re
import logging
import helper
from converter_abstract_language import ConverterAbstract

logger = logging.getLogger(__name__)

CONSTRUCTOR_RE = re.compile(re.escape('constructor(data?: any[] | %s) {') % '(.*?)', flags=re.DOTALL)
ENUM_RE = re.compile('enum (\w+) {', flags=re.DOTALL)

class ConverterTypescript(ConverterAbstract):
    def __init__(self):
        super(ConverterTypescript, self).__init__(constants.LANGUAGE_TYPESCRIPT)

    def get_protoc_command(self, full_proto_file_path):
        proto_gen_tc_app = "protoc-gen-ts"

        if os.name == 'nt':
            logger.info("Using 'protoc-gen-ts.cmd' instead of 'protoc-gen-ts' on %s operating system", os.name)
            proto_gen_tc_app = "protoc-gen-ts.cmd"

        protoc_gen_ts_path = os.path.join(os.path.dirname(constants.DIR_MAIN), 'node_modules', '.bin', proto_gen_tc_app)
        dir_input = os.path.join(self.input_dir_path, constants.TYPE_TYPES)
        dir_output = os.path.join(self.output_dir_path, constants.TYPE_TYPES)
        helper.create_dir(dir_output)
        return [
            'protoc',
            f'--plugin=protoc-gen-ts={protoc_gen_ts_path}',
            f'--ts_out={dir_output}',
            f'-I={dir_input}',
            full_proto_file_path,
        ]

    def post_process_model(self, content, full_proto_file_path):
        content = ConverterTypescript.replace_camelcased_properties(content)
        content = ConverterTypescript.replace_enum_prefixes(content)
        return content

    def replace_enum_prefixes(content):
        matches = re.findall(ENUM_RE, content)

        for m in matches:
            content = re.sub(r"\b%s_" % m, '', content)

        return content

    def replace_camelcased_properties(content):
        def extract_arg_name(line):
            return line.replace('{', '').replace('}', '').strip().split(':')[0].replace('?', '')

        def camelize(line):
            parts = line.split('_')

            return parts[0] + ''.join(x.title() for x in parts[1:])

        def check_match(f, to):
            return f != to and re.compile('\w+').match(f)

        matches = re.findall(CONSTRUCTOR_RE, content)

        for m in matches:
            initial_args = list(map(extract_arg_name, m.strip().split('\n')))
            replacements = list(map(camelize, initial_args))

            for i, arg in enumerate(initial_args):
                if check_match(arg, replacements[i]):
                    logger.info('replacing %s => %s', arg, replacements[i])
                    content = re.sub(r"\b%s\b" % arg, replacements[i], content)
                    content = re.sub(r"\b_%s\b" % arg, '_' + replacements[i], content)

        return content
