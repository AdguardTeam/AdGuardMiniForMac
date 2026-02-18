#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

CONFIGURATION=${bamboo_build_config}
CHANNEL=${bamboo_update_channel}
VERSION_NAME="${bamboo_inject_base_version_name}"
APP_NAME="AdGuardMini"
IS_CRITICAL_UPDATE=${bamboo_sparkle_critical_update:-false}

BUILD_PATH="${PWD}/build/${CONFIGURATION}"
DERIVED_DATA_PATH="${BUILD_PATH}/derived_data"
SPARKLE_PATH="${DERIVED_DATA_PATH}/SourcePackages/artifacts/sparkle/Sparkle/bin/generate_appcast"
APPCAST_PATH="${BUILD_PATH}/adguard-mini-appcast.xml"

RELEASE_NOTES_URL="https://link.adtidy.org/forward.html?app=mac-mini&v=&action=update_release_notes&from=updater&channel=${CHANNEL}"

# Download actual packages including Sparkle

xcodebuild \
    -resolvePackageDependencies \
    -project AdguardMini/AdguardMini.xcodeproj \
    -scheme AdguardMini \
    -configuration Release \
    -derivedDataPath "${DERIVED_DATA_PATH}"

# Generate appcast

bundle exec fastlane generate_appcast \
    config:${CONFIGURATION} \
    output:"${APPCAST_PATH}" \
    updates:"${BUILD_PATH}" \
    sparkle:"${SPARKLE_PATH}" \
    release_notes_url:${RELEASE_NOTES_URL} \
    channel:${CHANNEL} \
    is_critical_update:${IS_CRITICAL_UPDATE}

echo "Clear Sparkle_generate_appcast cache"
rm -rf ~/Library/Caches/Sparkle_generate_appcast

sed -i '' "s/${APP_NAME}\.app\.zip/${APP_NAME}-${VERSION_NAME}\.app\.zip/g" "${APPCAST_PATH}"

cat ${APPCAST_PATH}
