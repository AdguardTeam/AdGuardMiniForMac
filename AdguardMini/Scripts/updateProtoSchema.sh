#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

source "Support/Scripts/include/common.inc"

cd "AdguardMini"

# Common variables
SCITER_FOLDER_PATH="./sciter-ui"
SCITER_RESOURCES_PATH="./SciterResources"
NODE_MODULES_PATH="../node_modules"

# Proto generation common dirs
PROTO_GEN_DIR="$NODE_MODULES_PATH/@adg/proto-generator"
PROTO_SCHEMA_DIR="$SCITER_FOLDER_PATH/schema"
PROTO_CONFIG_DIR="$PROTO_SCHEMA_DIR/.protocfg"

# Swift generation props
SWIFT_SCHEMA_OUTPUT_DIR="$SCITER_RESOURCES_PATH/SciterSchema/Sources"

# Typescript generation props
TYPESCRIPT_SCHEMA_OUTPUT_DIR="$SCITER_FOLDER_PATH/modules/common/apis"

echo
echo "=================================================================="
echo "Verify protoc tools versions"
echo "=================================================================="
echo

if ! command -v protoc &> /dev/null; then
    echo "Error: protoc not found in PATH"
    echo ""
    echo "Please run: ./configure.sh dev"
    echo "Or ensure build/protoc-tools/bin is in your PATH"
    exit 1
fi

if ! command -v protoc-gen-swift &> /dev/null; then
    echo "Error: protoc-gen-swift not found in PATH"
    echo ""
    echo "Please run: ./configure.sh dev"
    echo "Or ensure build/protoc-tools/bin is in your PATH"
    exit 1
fi

echo "protoc: $(command -v protoc)"
protoc --version
echo "protoc-gen-swift: $(command -v protoc-gen-swift)"
protoc-gen-swift --version
echo

echo
echo "=================================================================="
echo "Cleanup and make dirs"
echo "=================================================================="
echo

if [ -d "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/callbacks" ]; then
    find "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/callbacks" -type f -name "*.ts" -delete
fi
if [ -d "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/requests" ]; then
    find "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/requests" -type f -name "*.ts" -delete
fi
if [ -d "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/types" ]; then
    find "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/types" -type f -name "*.ts" -delete
fi
find "$SWIFT_SCHEMA_OUTPUT_DIR" -type f -name "*.swift" -delete

echo "Done!"

echo
echo "=================================================================="
echo "Run protogen for swift"
echo "=================================================================="
echo

python3 "$PROTO_GEN_DIR/proto-parser/src/main.py" -l swift -c "$PROTO_CONFIG_DIR" -i $PROTO_SCHEMA_DIR -o $SWIFT_SCHEMA_OUTPUT_DIR

echo
echo "=================================================================="
echo "Run protogen for typescript"
echo "=================================================================="
echo

python3 "$PROTO_GEN_DIR/proto-parser/src/main.py" -l typescript -c "$PROTO_CONFIG_DIR" -i "$PROTO_SCHEMA_DIR" -o "$TYPESCRIPT_SCHEMA_OUTPUT_DIR"
