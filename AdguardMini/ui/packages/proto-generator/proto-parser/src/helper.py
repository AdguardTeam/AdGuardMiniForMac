# coding: utf8
import os
import hashlib
import simplejson
import constants
import codecs
import argparse
import structures
import subprocess
import sys
import logging
from termcolor import colored
from datetime import datetime
import textwrap

logger = logging.getLogger(__name__)

class Formatter(logging.Formatter):
    def format(self, record):
        record.msg = record.msg.replace('%s', colored('%s', 'cyan'))

        return logging.Formatter.format(self, record)

def pascal_to_camel(pascal_string):
    """Converts from PascalCase to camelCase """
    chars = list(pascal_string)
    chars[0] = chars[0].lower()
    return "".join(chars)

def camel_to_pascal(camel_string):
    """Converts from camelCase to PascalCase """
    chars = list(camel_string)
    chars[0] = chars[0].upper()
    return "".join(chars)

def get_file_name(full_file_path):
    """ Gets the file name from the passed ful file path """
    return os.path.splitext(os.path.basename(full_file_path))[0]

def start_command(command):
    """ Starts the specified command as an argument list (no shell).

    The command is built from config/CLI-supplied paths, which may contain
    spaces (e.g. a home directory with a space) or shell metacharacters.
    Passing a list with ``shell=False`` avoids any shell tokenization /
    interpretation of those inputs.
    """
    logger.info("Start command: %s", " ".join(command))

    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=False)
    (output, err) = process.communicate()
    exit_code = process.returncode  # communicate() already waited for the process

    if exit_code != 0:
        logger.error("Process closed with exit code %s", exit_code)
        logger.error("Output is %s", err.decode(errors="replace"))

        sys.exit(255)

    return output

def save_credentials(hash, language, type, dir_path):
    """Saves the output data credentials"""
    credentials = structures.Credentials(
        version=constants.VERSION,
        date=datetime.today().strftime('%Y-%m-%d-%H:%M:%S'),
        language=language,
        type=type,
        hash=hash
    )

    path = os.path.join(dir_path, f"{type}_credentials.json")
    current_credentials = read_file(path)

    if current_credentials is not None:
        logging.info('credentials file %s found', path)
        json = simplejson.loads(current_credentials)

        if json['hash'] == hash:
            logger.info("No need to save credentials because there are no changed files of type %s", language)
            return

    save_json_to_file(credentials, path)
    logger.info("Credentials has been saved to %s", path)

def get_sha256_hash(dataStr):
    """ Returns sha256 hash for specified data string """
    base_hasher = hashlib.sha256(dataStr.encode('utf-8'))
    base_hash = base_hasher.hexdigest()
    return base_hash

def save_json_to_file(data_json, filename):
    """ Saves json object to the file with specified filename """
    data_json_str = simplejson.dumps(
        data_json,
        indent=4,
        namedtuple_as_object=True,
        ensure_ascii=False
    )

    save_to_file(data_json_str + "\n", filename)

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
    logger.info("Read file placed in: %s", file_path)
    if os.path.isfile(file_path) and os.access(file_path, os.R_OK):
        logger.info("File %s is accessible and exists, try to read it", file_path)
        #TODO: fix newline problem
        with codecs.open(file_path, mode='r', encoding='utf-8') as input_file:
            return input_file.read()
    else:
        logger.info("File %s does not exist or is not accessible, exiting", file_path)
        return None

def configure():
    """Configures the builder's environment"""
    if not os.path.exists(constants.DIR_LOG) or not os.path.isdir(constants.DIR_LOG):
        os.mkdir(constants.DIR_LOG)

    ch = logging.StreamHandler()
    ch.setFormatter(Formatter())

    logging.basicConfig(
        format='%(asctime)s - %(levelname)s : (%(module)s) %(message)s',
        datefmt='%m/%d/%Y %I:%M:%S %p',
        #filename=constants.PATH_LOG.format(t0_string),
        level=constants.LOGGING_LEVEL,
        handlers=[ch]
    )

    logger.info(
"\n************************************************\n\
Main directory is %s,\n\
Default builder's schema version is %s,\n\
************************************************",
        constants.DIR_MAIN,
        constants.VERSION
    )

def get_args():
    """Parses and returns arguments, passed to the script"""
    parser = argparse.ArgumentParser()
    parser.add_argument('-l', '--languages', dest='languages', action='append', required=False)
    parser.add_argument('-o', '--output_dir', dest='output_dir', action='store', required=False)
    parser.add_argument('-i', '--input_dir', dest='input_dir', action='store', required=False)
    parser.add_argument('-c', '--configs_dir', dest='configs_dir', action='store', required=True)
    args = parser.parse_args()
    logger.info('Args are: %s', args)
    return args

def create_dir(dir_name):
    """ Creates directory if not exists"""
    if not os.path.exists(dir_name) or not os.path.isdir(dir_name):
        os.mkdir(dir_name)
