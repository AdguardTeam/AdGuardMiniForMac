#!/bin/sh

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

CONFIGURATION="${1}"
PROJECT_ROOT="${SRCROOT}/.."
YARN="${PROJECT_ROOT}/bin/yarn"

[ -x "$YARN" ] || {
    echo "Error: Toolchain not configured. Run ./configure.sh" >&2
    exit 1
}

if [ "$CONFIGURATION" = "Debug" ]; then
    BUILD_TYPE="dev"
else
    BUILD_TYPE="prod"
fi

cd "$PROJECT_ROOT" || exit 1

# Isolate Yarn cache inside derived_data to prevent race conditions when
# Xcode runs multiple targets in parallel (e.g. Build Sciter UI and
# Build advanced script both call yarn install concurrently).
export YARN_CACHE_FOLDER="${DERIVED_FILE_DIR}/.yarn-cache"

"$YARN" || exit 1
"$YARN" "build:${BUILD_TYPE}" || exit 1
AdguardMini/Scripts/generateUI.sh || exit 1
