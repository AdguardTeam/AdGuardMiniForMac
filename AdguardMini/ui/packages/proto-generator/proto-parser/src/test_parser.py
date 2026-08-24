import proto_parser
import helper
import os
import constants

def test_proto_parser():
    # Smoke test - should find 1 top level statements in the example:
    proto_content = helper.read_file(os.path.join(constants.DIR_SAMPLES, 'input', 'services', 'test.proto'))
    assert proto_content is not None, "missing samples/input/services/test.proto fixture"
    result = proto_parser.proto.parse(proto_content).statements
    assert len(result) == 1

if __name__ == '__main__':
    test_proto_parser()
