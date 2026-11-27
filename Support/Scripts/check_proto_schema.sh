#!/bin/sh

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -eu

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VERSION_FILE="$PROJECT_ROOT/.protoc-version"
PROTOC_BIN=""

if [ -n "${PROTOC:-}" ]; then
    # A relative PROTOC must survive the cd into the schema directory below.
    PROTOC_BIN="$(cd "$(dirname "$PROTOC")" 2>/dev/null && pwd)/$(basename "$PROTOC")"
elif [ -x "$PROJECT_ROOT/build/protoc-tools/bin/protoc" ]; then
    PROTOC_BIN="$PROJECT_ROOT/build/protoc-tools/bin/protoc"
elif command -v protoc >/dev/null 2>&1; then
    PROTOC_BIN="$(command -v protoc)"
fi

if [ -z "$PROTOC_BIN" ]; then
    printf 'Error: protoc not found. Tried PROTOC=%s, %s, and protoc on PATH.\n' \
        "${PROTOC:-<unset>}" "$PROJECT_ROOT/build/protoc-tools/bin/protoc" >&2
    printf 'Run ./configure.sh dev, or set PROTOC to a matching protoc binary.\n' >&2
    exit 1
fi

if [ ! -f "$VERSION_FILE" ]; then
    echo "Error: $VERSION_FILE is missing." >&2
    echo "Run ./configure.sh dev, or set PROTOC to a matching protoc binary." >&2
    exit 1
fi

EXPECTED_VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"

if [ -z "$EXPECTED_VERSION" ]; then
    echo "Error: $VERSION_FILE is empty." >&2
    echo "Run ./configure.sh dev, or set PROTOC to a matching protoc binary." >&2
    exit 1
fi

FOUND_VERSION="$("$PROTOC_BIN" --version 2>&1 || true)"
# A substring match also accepts another compiler: `31.1` matches `31.10`.
FOUND_NUMBER="$(printf '%s\n' "$FOUND_VERSION" | sed -n 's/^libprotoc //p')"

if [ "$FOUND_NUMBER" != "$EXPECTED_VERSION" ]; then
    echo "Error: protoc $EXPECTED_VERSION required, found $FOUND_VERSION." >&2
    printf 'Resolution order: PROTOC, %s, protoc on PATH.\n' \
        "$PROJECT_ROOT/build/protoc-tools/bin/protoc" >&2
    echo "Run ./configure.sh dev, or set PROTOC to a matching protoc binary." >&2
    exit 1
fi

cd "$PROJECT_ROOT/AdguardMini/ui/schema"

# Generation writes one output file per schema file into one folder, so a
# nested schema file would produce no output. The generator rejects it, and
# the gate must reject it too.
NESTED_PROTO_FILES="$(find types services callbacks -mindepth 2 -name '*.proto' 2>/dev/null)"
if [ -n "$NESTED_PROTO_FILES" ]; then
    printf 'Error: the schema layout must stay flat, found:\n%s\n' "$NESTED_PROTO_FILES" >&2
    exit 1
fi

# Service and callback generation expects exactly one service per file.
for proto_file in $(find services callbacks -name '*.proto' | sort); do
    SERVICE_COUNT="$(grep -cE '^[[:space:]]*service[[:space:]]+[A-Za-z_]' "$proto_file" || true)"
    if [ "$SERVICE_COUNT" -ne 1 ]; then
        printf 'Error: %s must declare exactly one service, found %s.\n' \
            "$proto_file" "$SERVICE_COUNT" >&2
        exit 1
    fi
done

PROTO_FILES="$(find types services callbacks -name '*.proto' | sort)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Word splitting is intended: the sorted file list becomes the protoc arguments.
"$PROTOC_BIN" --fatal_warnings --descriptor_set_out="$TMP_DIR/descriptor.pb" \
    -I types -I services -I callbacks $PROTO_FILES

FILE_COUNT=$(printf '%s\n' $PROTO_FILES | wc -l | tr -d ' ')

printf 'protoc %s: %s schema files compiled with --fatal_warnings, no warnings\n' \
    "$EXPECTED_VERSION" "$FILE_COUNT"
