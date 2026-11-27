import constants
import os
import helper
from converter_abstract_language import ConverterAbstract

class SwiftConverter(ConverterAbstract):
    def get_protoc_command(self, full_proto_file_path):
        dir_input = os.path.join(self.input_dir_path, constants.TYPE_TYPES)
        dir_output = os.path.join(self.output_dir_path, constants.TYPE_TYPES)
        helper.create_dir(dir_output)

        return [
            "protoc",
            f"--swift_out={dir_output}",
            "--swift_opt=Visibility=Public",
            f"--proto_path={dir_input}",
            full_proto_file_path,
        ]
