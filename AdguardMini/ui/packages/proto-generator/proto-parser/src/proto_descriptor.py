# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""Reads the Protobuf schema from protoc's descriptor output.

`load` compiles the schema of an input directory once with
`protoc --descriptor_set_out --include_source_info` and reads the fields the
templates render from the descriptor: services, their RPC methods, the
request and response type names, and the doc comments.
"""

import functools
import os
import re
import tempfile

from google.protobuf import descriptor_pb2

import constants
import helper

# Location paths are field numbers of the descriptor messages.
SERVICE_PATH_FIELD = descriptor_pb2.FileDescriptorProto.DESCRIPTOR.fields_by_name["service"].number
METHOD_PATH_FIELD = descriptor_pb2.ServiceDescriptorProto.DESCRIPTOR.fields_by_name["method"].number

SCHEMA_DIRS = (constants.TYPE_TYPES, constants.TYPE_SERVICES, constants.TYPE_CALLBACKS)


class Method(object):
    """One RPC method of a service."""

    def __init__(self, name, description, request_message_type, response_message_type):
        """Initializes the method model"""
        self.name = name
        self.description = description
        self.request_message_type = request_message_type
        self.response_message_type = response_message_type


class Service(object):
    """One service declared in a proto file."""

    def __init__(self, name, description, methods):
        """Initializes the service model"""
        self.name = name
        self.description = description
        self.methods = methods


class ProtoSchema(object):
    """Services of every proto file in one input directory, keyed by file name."""

    def __init__(self, services_by_file):
        """Initializes the schema with the decoded services"""
        self.services_by_file_ = services_by_file

    def service(self, proto_file_path):
        """Gets the only service the proto file declares.

        Service and callback files are generated one service per file, so a
        file without a service or with several services is a schema error.
        """
        services = self.services_by_file_.get(os.path.basename(proto_file_path), [])

        if len(services) != 1:
            raise ValueError(
                f"{proto_file_path} must declare exactly one service, found {len(services)}")

        return services[0]


def load(input_dir):
    """Gets the schema of an input directory, compiling it once per process"""
    return _load_schema(os.path.realpath(input_dir))


@functools.lru_cache(maxsize=None)
def _load_schema(input_dir):
    """Builds the schema of an input directory"""
    descriptor_set = descriptor_pb2.FileDescriptorSet()
    descriptor_set.ParseFromString(_compile(input_dir))

    return ProtoSchema({
        os.path.basename(file_proto.name): _decode_file(file_proto)
        for file_proto in descriptor_set.file
    })


def _compile(input_dir):
    """Gets the descriptor set of the schema in input_dir, with source info.

    Every schema file is compiled in one protoc call, so imports resolve
    across the three schema folders and every file's comments are present.
    """
    include_dirs = [
        os.path.join(input_dir, schema_dir)
        for schema_dir in SCHEMA_DIRS
        if os.path.isdir(os.path.join(input_dir, schema_dir))
    ]
    proto_paths = sorted(
        path
        for include_dir in include_dirs
        for path in _proto_paths(include_dir)
    )

    descriptor_handle, descriptor_path = tempfile.mkstemp(suffix=".pb")
    os.close(descriptor_handle)

    try:
        command = ["protoc", "--include_source_info", f"--descriptor_set_out={descriptor_path}"]
        command.extend(f"-I={include_dir}" for include_dir in include_dirs)
        command.extend(proto_paths)
        helper.start_command(command, f"protoc --include_source_info over {len(proto_paths)} schema files")
        with open(descriptor_path, "rb") as descriptor_file:
            return descriptor_file.read()
    finally:
        os.remove(descriptor_path)


def _proto_paths(include_dir):
    """Gets the proto files of one schema folder, which must stay flat.

    Generation writes one output file per schema file into one output folder,
    so a nested schema file would produce no output and no error.
    """
    paths = []

    for dir_path, _, names in os.walk(include_dir):
        for name in names:
            if not name.endswith(".proto"):
                continue

            path = os.path.join(dir_path, name)
            if dir_path != include_dir:
                raise ValueError(
                    f"{path} is in a subdirectory of {include_dir}; the schema layout is flat")

            paths.append(path)

    return paths


def _decode_file(file_proto):
    """Gets the services of one FileDescriptorProto with their doc comments"""
    locations = {
        tuple(location.path): location
        for location in file_proto.source_code_info.location
    }

    return [
        _decode_service(service, index, file_proto.package, locations)
        for index, service in enumerate(file_proto.service)
    ]


def _decode_service(service_proto, index, package, locations):
    """Decodes one ServiceDescriptorProto"""
    service_path = (SERVICE_PATH_FIELD, index)
    service_location = locations.get(service_path)
    methods = [
        _decode_method(
            method,
            service_path + (METHOD_PATH_FIELD, method_index),
            package,
            locations,
            # protoc reports the comment above a service's first method as
            # the service's own trailing comment.
            _trailing_comment(service_location) if method_index == 0 else "",
        )
        for method_index, method in enumerate(service_proto.method)
    ]

    return Service(
        name=service_proto.name,
        description=_description(service_location),
        methods=methods,
    )


def _decode_method(method_proto, path, package, locations, parent_comment):
    """Decodes one MethodDescriptorProto"""
    return Method(
        name=method_proto.name,
        description=_description(locations.get(path), parent_comment),
        request_message_type=_unqualified(method_proto.input_type, package),
        response_message_type=_unqualified(method_proto.output_type, package),
    )


def _description(location, parent_comment=""):
    """Gets the doc comment of one declaration.

    protoc keeps a comment that a blank line separates from its declaration
    out of the adjacent comments, so the last detached block is used instead.
    """
    if location is None:
        return _single_line(parent_comment)

    text = location.leading_comments
    if not text and location.leading_detached_comments:
        text = location.leading_detached_comments[-1]

    return _single_line(text or parent_comment)


def _trailing_comment(location):
    """Gets the trailing comment of one location"""
    return location.trailing_comments if location else ""


def _single_line(text):
    """Collapses a comment block into a single-line description.

    The descriptor removes the indentation of a comment's continuation lines,
    so the lines are joined by the collapsed whitespace instead of running
    the last word of one line into the first word of the next.
    """
    return re.sub(r"\s+", " ", text).strip()


def _unqualified(type_name, package):
    """Strips the leading dot and the declaring package from a type name"""
    if package and type_name.startswith(f".{package}."):
        return type_name[len(package) + 2:]

    return type_name.lstrip(".")
