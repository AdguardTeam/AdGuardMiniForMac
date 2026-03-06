#!/bin/sh

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

CONFIGURATION="${1}"
PROJECT_ROOT="${SRCROOT}/.."
FASTLANE="${PROJECT_ROOT}/bin/fastlane"

[ -x "$FASTLANE" ] || {
    echo "Error: Toolchain not configured. Run ./configure.sh" >&2
    exit 1
}

cd "$PROJECT_ROOT"
"$FASTLANE" build_sciter_ui config:"${CONFIGURATION}"
