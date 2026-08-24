#!/bin/sh

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

#
#  rebuildDebugBuild.sh
#  AdguardMini
#
#  Backwards-compatible wrapper: rebuilds the web UI, injects it into the
#  existing Debug build and relaunches the app. See Scripts/syncWebUI.sh for
#  the implementation and the supported options.
#

set -e

exec "$(dirname "$0")/syncWebUI.sh" "$@"
