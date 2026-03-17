#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -ex
ls -la

BUILD_DIR=$(pwd)/build
ARCHIVE_NAME="AdGuard Mini.xcarchive"
ZIP_ARCHIVE_NAME="AdGuardMini.xcarchive.zip"
ARCHIVE_PATH="$BUILD_DIR/$ARCHIVE_NAME"

/usr/bin/ditto -x -k "$BUILD_DIR/MAS/$ZIP_ARCHIVE_NAME" "$BUILD_DIR/"

bin/fastlane upload_to_mas archive:"$ARCHIVE_PATH"
