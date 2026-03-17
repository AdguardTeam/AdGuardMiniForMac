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
"$YARN" install
"$YARN" build "${AGP_ADVANCED_SCRIPT_FILE}"
