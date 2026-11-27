# coding: utf8
import os

# common constants
VERSION = "1"

# paths' const
DIR_MAIN = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))

DIR_TEMPLATES = os.path.join(DIR_MAIN, "templates")
DIR_CONFIGS = ""

LANGUAGE_SWIFT = "swift"
LANGUAGE_TYPESCRIPT = "typescript"

TYPE_SERVICES = "services"
TYPE_TYPES = "types"
TYPE_CALLBACKS = "callbacks"
TYPE_REQUESTS = "requests"

EMPTY_VALUE_TYPE = "EmptyValue"

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

COMMON_GENERATED_FILES_PREAMBLE = f"This code was generated automatically by proto-parser tool version {VERSION}"
