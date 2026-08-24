#!/bin/sh

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

echo "Start Build resources build phase"

echo "Built Product Dir: ${BUILT_PRODUCTS_DIR}"
"${BUILT_PRODUCTS_DIR}/AdguardMini Builder" --$AG_CHANNEL "${BUILT_PRODUCTS_DIR}"

RESOURCES="${BUILT_PRODUCTS_DIR}/${CONTENTS_FOLDER_PATH}/Resources/"

echo "Copying resources..."

cp -Rv "${BUILT_PRODUCTS_DIR}/${AG_DEFAULT_FILTERSDB_DIRNAME}" "${RESOURCES}"

# Bundle the WKWebView UI ("WebUI") directory so WKWebViewAppHost can
# resolve WebUI/<module>.html at runtime via
# Bundle.main.url(forResource:withExtension:subdirectory:). The source
# lives at MiniResources/WebUI and is emitted directly by webpack on the
# preceding "Build Web UI" phase (see Scripts/buildWebUIPhase.sh and
# ui/scripts/webpack/webpack.config.base.js DIST_PATH). Without this
# copy the lookup returns nil and the app traps in
# WKWebViewAppHost.resolveEntryURL -> fatalError("missing WebUI/...").
WEBUI_SRC="${SRCROOT}/MiniResources/WebUI"
WEBUI_DST="${RESOURCES}WebUI"
if [[ -d "${WEBUI_SRC}" ]]; then
  echo "Copying WebUI bundle..."
  rsync -a --delete "${WEBUI_SRC}/" "${WEBUI_DST}/"
  # Validate the per-module entry files actually arrived: the `-d` guard only
  # proves the source directory exists, so an empty/partial webpack output
  # (e.g. an interrupted build) would otherwise slip through `set -e` and trap
  # at runtime with "missing WebUI/<module>.html".
  for module in tray settings onboarding userrules; do
    if [[ ! -f "${WEBUI_DST}/${module}.html" ]]; then
      echo "error: ${WEBUI_DST}/${module}.html is missing (webpack output incomplete)."
      echo "Run 'yarn build:dev' (the 'Build Web UI' Xcode phase does this automatically) before building, then rebuild."
      exit 1
    fi
  done
else
  echo "error: ${WEBUI_SRC} is missing."
  echo "Run 'yarn build:dev' (the 'Build Web UI' Xcode phase does this automatically) before building, then rebuild."
  exit 1
fi
