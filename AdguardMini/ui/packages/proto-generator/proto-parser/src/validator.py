# coding: utf8
import os
import constants

def validate_args(args):
    """ Validates passed arguments """
    if not os.path.exists(args.input_dir) or not os.path.isdir(args.input_dir):
        raise ValueError(f"Input directory {args.input_dir} is specified wrongly")

    # makedirs handles nested paths and is not racy (no check-then-act).
    os.makedirs(args.output_dir, exist_ok=True)

    constants.DIR_CONFIGS = args.configs_dir
    if not os.path.exists(constants.DIR_CONFIGS) or not os.path.isdir(constants.DIR_CONFIGS):
        raise ValueError(f"Configs directory {constants.DIR_CONFIGS} is specified wrongly")
