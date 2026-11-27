#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

source "Support/Scripts/include/common.inc"

PYTHON_BIN="${VIRTUAL_ENV:-$PYTHON_VENV}/bin/python3"
if [ ! -x "$PYTHON_BIN" ]; then
    echo "Error: Python interpreter not found at $PYTHON_BIN" >&2
    echo "Please run: ./configure.sh dev" >&2
    exit 1
fi

cd "AdguardMini"

# Common variables
UI_FOLDER_PATH="./ui"
RESOURCES_PATH="./MiniResources"
NODE_MODULES_PATH="../node_modules"

# Proto generation common dirs
PROTO_GEN_DIR="$NODE_MODULES_PATH/@adg/proto-generator"
PROTO_SCHEMA_DIR="$UI_FOLDER_PATH/schema"
PROTO_CONFIG_DIR="$PROTO_SCHEMA_DIR/.protocfg"

# Swift generation props
SWIFT_SCHEMA_OUTPUT_DIR="$RESOURCES_PATH/ProtoSchema/Sources"

# Typescript generation props
TYPESCRIPT_SCHEMA_OUTPUT_DIR="$UI_FOLDER_PATH/modules/common/apis"

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

# A pin bump leaves stale tools installed until ./configure.sh dev runs.
EXPECTED_PROTOC_VERSION="$(tr -d '[:space:]' < ../.protoc-version)"
FOUND_PROTOC_VERSION="$(protoc --version | sed -n 's/^libprotoc //p')"

if [ "$FOUND_PROTOC_VERSION" != "$EXPECTED_PROTOC_VERSION" ]; then
    echo "Error: protoc $EXPECTED_PROTOC_VERSION required, found ${FOUND_PROTOC_VERSION:-unknown}"
    echo "Please run: ./configure.sh dev"
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
    # Generated callback services only. The implementations live in
    # `apis/impl/`, outside every path this script deletes.
    find "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/callbacks" -type f -name "*.ts" -delete
fi
if [ -d "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/requests" ]; then
    find "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/requests" -type f -name "*.ts" -delete
fi
if [ -d "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/types" ]; then
    find "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/types" -type f -name "*.ts" -delete
fi
# Exclude the handcrafted Sources/WebView/ subtree (`WKWebViewBridge`,
# `WebViewCallbackBridge`, and the RPC dispatcher) from the find-delete —
# Only the regenerated subdirs (Sources/services/, Sources/callbacks/,
# Sources/types/) are wiped.
find "$SWIFT_SCHEMA_OUTPUT_DIR" -type f -name "*.swift" \
    -not -path "$SWIFT_SCHEMA_OUTPUT_DIR/WebView/*" -delete

echo "Done!"

echo
echo "=================================================================="
echo "Run protogen for swift"
echo "=================================================================="
echo

"$PYTHON_BIN" "$PROTO_GEN_DIR/proto-parser/src/main.py" -l swift -c "$PROTO_CONFIG_DIR" -i $PROTO_SCHEMA_DIR -o $SWIFT_SCHEMA_OUTPUT_DIR

echo
echo "=================================================================="
echo "Run protogen for typescript"
echo "=================================================================="
echo

"$PYTHON_BIN" "$PROTO_GEN_DIR/proto-parser/src/main.py" -l typescript -c "$PROTO_CONFIG_DIR" -i "$PROTO_SCHEMA_DIR" -o "$TYPESCRIPT_SCHEMA_OUTPUT_DIR"

echo
echo "=================================================================="
echo "Generate ServiceMethodAllowlist"
echo "=================================================================="
echo

# The working directory is AdguardMini/ here, so the invocation path is relative to it.
"$PYTHON_BIN" "Scripts/generateMethodAllowlist.py" \
    "$PROTO_SCHEMA_DIR/services" \
    "$SWIFT_SCHEMA_OUTPUT_DIR/ServiceMethodAllowlist.swift"

echo
echo "=================================================================="
echo "Add SPDX headers to generated Swift files"
echo "=================================================================="
echo

# protoc-gen-swift and the @adg/proto-generator templates emit no copyright
# header of their own, so prepend the project SPDX block after generation.
# Idempotent: files that already carry the header are left untouched, which
# keeps the step safe across repeated runs and covers every regenerated
# file (types/, services/, callbacks/, ServiceMethodAllowlist.swift).
SPDX_HEADER="$(cat <<'SPDX_BLOCK'
// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later
SPDX_BLOCK
)"

find "$SWIFT_SCHEMA_OUTPUT_DIR" -type f -name "*.swift" \
    -not -path "$SWIFT_SCHEMA_OUTPUT_DIR/WebView/*" -print0 | while IFS= read -r -d '' file; do
    if ! grep -q "SPDX-FileCopyrightText" "$file"; then
        { printf '%s\n\n' "$SPDX_HEADER"; cat "$file"; } > "$file.tmp" && mv "$file.tmp" "$file"
    fi
done

echo "Done!"
