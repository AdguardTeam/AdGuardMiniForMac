import proto_parser
import re

def prepare_parser_result(parser_result):
    """Prepares the parser result for further using in converters"""
    services = list(filter(lambda s: isinstance(s, proto_parser.DescribedObject), parser_result.statements))
    if not services:
        raise ValueError("No service found in the parsed proto file")

    first_service = services[0]

    first_service.description = multiline_to_singleline(
        first_service.description
    )

    for method in first_service.body.body:
        method.description = multiline_to_singleline(method.description)

def multiline_to_singleline(line):
    """Convert multiline with any carriage returns and tabs to the singleline instead"""
    if not isinstance(line, str):
        return line

    line = line.replace('*','').replace('\r\n','').replace('\t', '').replace('\n','')
    line = re.sub(r' {1,6}', ' ', line)
    return line
