#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

if [ "$1" == "push" ]; then
    bin/yarn locales:pushMaster
    ./support-scripts/localize.rb export -b
else
    bin/yarn locales:pull
    ./support-scripts/localize.rb import -l all -b
fi
