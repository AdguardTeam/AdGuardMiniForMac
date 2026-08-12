#!/bin/sh

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TOOLS_DIR="$PROJECT_ROOT/build/protoc-tools"

# Check if protoc tools are installed
if [ ! -x "$TOOLS_DIR/bin/protoc" ] || [ ! -x "$TOOLS_DIR/bin/protoc-gen-swift" ]; then
    echo "Error: protoc tools not found!" >&2
    echo "Please run: ./configure.sh dev" >&2
    exit 1
fi

# Add protoc tools to PATH
export PATH="$TOOLS_DIR/bin:$PATH"

echo "Version check:"
echo "  protoc:            $(protoc --version)"
echo "  protoc-gen-swift:  $(protoc-gen-swift --version)"
echo

cd "$PROJECT_ROOT"
AdguardMini/Scripts/updateProtoSchema.sh
