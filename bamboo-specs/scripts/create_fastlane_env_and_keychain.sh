#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

source bamboo-specs/scripts/include/setup_nvm.inc
setup_nvm

./configure.sh
bin/fastlane certs config:"$1"
