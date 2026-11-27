# coding: utf8
import os
import codecs
import argparse
import subprocess
import sys
import logging
import textwrap

logger = logging.getLogger(__name__)

def pascal_to_camel(pascal_string):
    """Converts from PascalCase to camelCase """
    chars = list(pascal_string)
    chars[0] = chars[0].lower()
    return "".join(chars)

def get_file_name(full_file_path):
    """ Gets the file name from the passed ful file path """
    return os.path.splitext(os.path.basename(full_file_path))[0]

def start_command(command, summary=None):
    """ Starts the specified command as an argument list (no shell).

    The command is built from config/CLI-supplied paths, which may contain
    spaces (e.g. a home directory with a space) or shell metacharacters.
    Passing a list with ``shell=False`` avoids any shell tokenization /
    interpretation of those inputs.

    ``summary`` replaces the logged command when the argument list is long,
    e.g. a compile of every schema file.
    """
    logger.info("Start command: %s", summary or " ".join(command))

    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=False)
    (output, err) = process.communicate()
    exit_code = process.returncode  # communicate() already waited for the process

    if exit_code != 0:
        logger.error("Process closed with exit code %s", exit_code)
        logger.error("Output is %s", err.decode(errors="replace"))

        sys.exit(255)

    return output

def save_to_file(data, filename):
    """Saves data to the file with specified filename"""
    if os.path.exists(filename) and os.path.isfile(filename):
        os.remove(filename)

    with codecs.open(filename, "wb", encoding='utf-8') as f_out:
        f_out.write(data)

def wrap_string(long_string, separator, string_length = 80):
    """ Wraps passed loooong string and replaces
    any carriage returns with a specified separator (for comments purposes).
    Desired string length also can be specified or left by default - 80 characters"""
    wrapped_list = textwrap.wrap(long_string, string_length)
    return f'\n{separator}'.join(wrapped_list)

def read_file(file_path):
    """ Reads file from specified location, according to is_json flag"""
    if os.path.isfile(file_path) and os.access(file_path, os.R_OK):
        #TODO: fix newline problem
        with codecs.open(file_path, mode='r', encoding='utf-8') as input_file:
            return input_file.read()
    else:
        return None

def configure():
    """Configures the builder's environment"""
    logging.basicConfig(format='%(levelname)s: %(message)s', level=logging.INFO)

def get_args():
    """Parses and returns arguments, passed to the script"""
    parser = argparse.ArgumentParser(
        prog='proto-generator',
        description='Generate Swift and TypeScript sources from Protobuf schema definitions.'
    )
    parser.add_argument('-l', '--languages', dest='languages', action='append', required=True,
                        choices=['swift', 'typescript'])
    parser.add_argument('-i', '--input-dir', dest='input_dir', action='store', required=True)
    parser.add_argument('-o', '--output-dir', dest='output_dir', action='store', required=True)
    parser.add_argument('-c', '--configs-dir', dest='configs_dir', action='store', required=True)
    args = parser.parse_args()
    return args

def create_dir(dir_name):
    """ Creates directory if not exists, including missing parents"""
    os.makedirs(dir_name, exist_ok=True)
