# coding: utf8
import os
import logging

# common constants
VERSION = "1"
LOGGING_LEVEL = logging.DEBUG

# paths' const
DIR_MAIN = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
DIR_SAMPLES = os.path.join(DIR_MAIN, "samples")
DIR_OUTPUT = os.path.join(DIR_SAMPLES, "output")
DIR_INPUT = os.path.join(DIR_SAMPLES, "input")

DIR_TEMPLATES = os.path.join(DIR_MAIN, "templates")
DIR_CONFIGS = ""

LANGUAGE_SWIFT = "swift"
LANGUAGE_TYPESCRIPT = "typescript"

TYPE_SERVICES = "services"
TYPE_TYPES = "types"
TYPE_CALLBACKS = "callbacks"
TYPE_REQUESTS = "requests"

EMPTY_VALUE_TYPE = "EmptyValue"
SYNTAX_PROTO_DEFINITION = 'syntax = "proto3";'

SUPPORTED_LANGUAGES_PARAMETERS = {
    LANGUAGE_SWIFT : {
        "extension_services" : ".swift",
        "extension_types" : ".pb.swift",
        "extension_callbacks" : ".swift",
    },
    LANGUAGE_TYPESCRIPT : {
        "extension_services" : ".ts",
        "extension_types" : ".ts",
        "extension_callbacks" : ".ts",
        "extension_requests" : ".ts"
    },
}

# logs
DIR_LOG = os.path.join(DIR_MAIN, "logs")
PATH_LOG = os.path.join(DIR_LOG, "log_{0}.log")

COMMON_GENERATED_FILES_PREAMBLE = f"This code was generated automatically by proto-parser tool version {VERSION}"
