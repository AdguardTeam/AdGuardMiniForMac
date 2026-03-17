#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

if [ ! -x "bin/yarn" ]; then
    echo "Error: Toolchain not configured. Run ./configure.sh dev" >&2
    exit 1
fi

if [ "$1" == "push" ]; then
    bin/yarn locales:pushMaster
    ./support-scripts/localize.rb export -b
else
    bin/yarn locales:pull
    ./support-scripts/localize.rb import -l all -b
fi
