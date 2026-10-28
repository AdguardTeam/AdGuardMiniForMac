#!/bin/sh

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

PROJECT_ROOT="${SRCROOT}/.."
YARN="${PROJECT_ROOT}/bin/yarn"

[ -x "$YARN" ] || {
    echo "Error: Toolchain not configured. Run ./configure.sh" >&2
    exit 1
}

cd "${SRCROOT}/PopupExtension/ContentScript"

# Isolate the Yarn cache inside derived_data so parallel builds never race on a shared cache.
export YARN_CACHE_FOLDER="${DERIVED_FILE_DIR}/.yarn-cache"

"$YARN" install

# Ensure the output directory exists before copying.
# cp does not create parent directories, so without this the publish step fails.
mkdir -p "$(dirname "${AGP_ADVANCED_SCRIPT_FILE}")"
"$YARN" build "${AGP_ADVANCED_SCRIPT_FILE}"
