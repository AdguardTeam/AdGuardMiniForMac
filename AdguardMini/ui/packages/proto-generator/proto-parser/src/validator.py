# coding: utf8
import sys
import logging
import os
import constants
import proto_parser

logger = logging.getLogger(__name__)

def print_usage():
    """ Prints the protocode-generator tool usage """
    logger.info('python proto-code-generator.py [--language] [--input_dir] [--output_dir] --configs_dir')
    logger.info('current args: %s', str(sys.argv))

def validate_args(args):
    """ Validates passed arguments """
    if not args.languages:
        logger.info("Languages are not specified, use the default instead")

        args.languages = [
            constants.LANGUAGE_TYPESCRIPT,
            constants.LANGUAGE_SWIFT
        ]

    if args.input_dir:
        logger.info("Input directory is specified")
        constants.DIR_INPUT = args.input_dir

    if not os.path.exists(constants.DIR_INPUT) or not os.path.isdir(constants.DIR_INPUT):
        print_usage()
        raise ValueError(f"Input directory {constants.DIR_INPUT} is specified wrongly")

    if args.output_dir:
        logger.info("Output directory is specified")
        constants.DIR_OUTPUT = args.output_dir
        # makedirs handles nested paths and is not racy (no check-then-act).
        os.makedirs(constants.DIR_OUTPUT, exist_ok=True)

    constants.DIR_CONFIGS = args.configs_dir
    if not os.path.exists(constants.DIR_CONFIGS) or not os.path.isdir(constants.DIR_CONFIGS):
        print_usage()
        raise ValueError(f"Configs directory {constants.DIR_CONFIGS} is specified wrongly")

def validate_parser_result(parser_result):
    """ Validates the parser results"""
    services = list(filter(lambda s: isinstance(s, proto_parser.DescribedObject), parser_result.statements))

    if len(services) > 1:
        raise ValueError("Each file must contain only one service")
