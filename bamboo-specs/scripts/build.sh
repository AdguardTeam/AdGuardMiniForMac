#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e -x

CONFIGURATION="${1}"
OBTAIN_VERSION="${2:-true}"

bin/fastlane build \
    config:"$CONFIGURATION" \
    obtain_version:"${OBTAIN_VERSION}" \
    notarize:"${bamboo_build_notarize}"
