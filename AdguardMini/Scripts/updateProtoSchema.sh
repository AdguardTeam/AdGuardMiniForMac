#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

source "Support/Scripts/include/common.inc"

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
    # `*Internal.ts` files are handwritten extension points: the generator
    # skips them on regeneration (see `should_skip_service_postfix` in
    # code_generator_typescript.py) precisely so their store-dispatch logic
    # survives. Deleting them here would make the generator re-emit empty
    # classes from the template, silently dropping the live implementation.
    find "$TYPESCRIPT_SCHEMA_OUTPUT_DIR/callbacks" -type f -name "*.ts" \
        -not -name "*Internal.ts" -delete
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

python3 "$PROTO_GEN_DIR/proto-parser/src/main.py" -l swift -c "$PROTO_CONFIG_DIR" -i $PROTO_SCHEMA_DIR -o $SWIFT_SCHEMA_OUTPUT_DIR

echo
echo "=================================================================="
echo "Run protogen for typescript"
echo "=================================================================="
echo

python3 "$PROTO_GEN_DIR/proto-parser/src/main.py" -l typescript -c "$PROTO_CONFIG_DIR" -i "$PROTO_SCHEMA_DIR" -o "$TYPESCRIPT_SCHEMA_OUTPUT_DIR"

echo
echo "=================================================================="
echo "Generate ServiceMethodAllowlist"
echo "=================================================================="
echo

# Post-processing step that emits the schema-derived per-service method
# allowlist consumed by `WKWebViewBridge` before dispatch. Reads the SAME
# services proto dir the codegen above consumed; does not modify the
# external @adg/proto-generator package.
#
# NOTE on path: `updateProtoSchema.sh` does `cd "AdguardMini"` on line 11,
# so the working directory for this whole script is the `AdguardMini/`
# folder. Invoking `python3 "AdguardMini/Scripts/generateMethodAllowlist.py"`
# would resolve to `AdguardMini/AdguardMini/Scripts/…` (nonexistent). The
# script-relative path is `Scripts/generateMethodAllowlist.py`.
python3 "Scripts/generateMethodAllowlist.py" \
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
