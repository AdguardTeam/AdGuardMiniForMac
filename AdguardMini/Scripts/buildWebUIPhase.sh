#!/bin/sh

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

#
#  buildWebUIPhase.sh
#  AdguardMini
#

# Xcode "Build Web UI" build phase.
#
# Builds the WKWebView user interface (Preact/MobX modules bundled by webpack).
# webpack emits its output (per-module HTML/JS/CSS) directly into
# MiniResources/WebUI/ (see DIST_PATH in webpack.config.base.js), which the
# subsequent "Build And Copy Addition Resources Script" phase rsyncs into the
# app bundle. Without this phase, building from Xcode leaves
# MiniResources/WebUI stale (or absent) and WKWebViewAppHost traps at
# runtime with "missing WebUI/<module>.html".
#
# This restores the behaviour of the "Build Sciter UI" PBXLegacyTarget deleted
# by the WKWebView migration (master commit 7e708e06), which ran webpack and
# packaged the output. Unlike the deleted master pipeline (and the former
# mirrorWebUI.sh two-step build/ -> MiniResources/WebUI/), webpack now writes
# straight to the resource dir: `output.clean: true` reproduces the old
# `rsync --delete` semantics in a single stage.
#
# Differences from the deleted master pipeline, required by AGENTS.md:
#   * Toolchain goes through bin/ wrappers (bin/yarn) instead of
#     `bundle exec fastlane` / hardcoded /opt/homebrew paths (AGENTS.md
#     "Toolchain wrappers" guideline in "Other").
#
# Incremental: to avoid running webpack on every Swift-only rebuild (the legacy
# make target likewise skipped when ui/ was unchanged), this phase only
# runs webpack when at least one file under ui/ is newer than the staged
# MiniResources/WebUI directory, or when the staged output is missing. The
# phase itself is marked alwaysOutOfDate so Xcode still runs this cheap check
# on every build.
#
# Out of scope: buildAdvancedScript.sh (popup content script) is wired to its
# own phase and is intentionally not touched here.

set -e

# Xcode injects CONFIGURATION and SRCROOT as environment variables.
CONFIGURATION="${CONFIGURATION:-Debug-Standalone}"

PROJECT_ROOT="${SRCROOT}/.."
YARN="${PROJECT_ROOT}/bin/yarn"
UI_DIR="${SRCROOT}/ui"
WEBUI_STAGED="${SRCROOT}/MiniResources/WebUI"

# Map the Xcode build configuration to the webpack build script: Debug
# configurations use the unminified dev bundle, everything else the prod bundle.
# The project's debug configurations are `Debug-Standalone` and `Debug-MAS`
# (see the XCConfigurationList entries in AdguardMini.xcodeproj).
case "${CONFIGURATION}" in
  Debug-Standalone|Debug-MAS)
    BUILD_SCRIPT="build:dev" ;;
  *)
    BUILD_SCRIPT="build:prod" ;;
esac

if [[ ! -x "${YARN}" ]]; then
  echo "error: Toolchain wrapper '${YARN}' is missing or not executable." >&2
  echo "Run './configure.sh dev' from the repository root to set up bin/ wrappers." >&2
  exit 1
fi

if [[ ! -d "${UI_DIR}" ]]; then
  echo "error: UI source directory '${UI_DIR}' is missing (SRCROOT misconfigured?)" >&2
  exit 1
fi

# Ensure Node.js dependencies are installed before invoking webpack. On CI the
# prepare step runs `./configure.sh` (non-dev) which intentionally skips
# `bin/yarn install`; the master pipeline installs deps inside the private
# checkout, but the Xcode webpack build phase replaces the legacy
# `build_sciter_ui` fastlane lane and has no such install step, so install
# repo-root deps here when `node_modules` is missing.
if [[ ! -d "${PROJECT_ROOT}/node_modules" ]]; then
  echo "node_modules missing — installing repo-root JS dependencies..."
  (
    cd "${PROJECT_ROOT}"
    "${YARN}" install
  )
fi

# Stamp file touched ONLY after a webpack run completes successfully. A
# directory mtime is not a reliable staleness signal: webpack's
# `output.clean: true` wipes the output dir, so a failed/partial run leaves it
# newer than the sources and the next build would wrongly skip webpack.
WEBUI_STAMP="${WEBUI_STAGED}/.build-stamp"

# Returns 0 (true) when webpack needs to run: the stamp is missing, or a
# tracked UI source changed since the last successful build. Invoked from an
# `if` condition, where errexit (set -e) is suspended for the call, so the
# explicit returns are authoritative.
ui_is_stale() {
  if [[ ! -f "${WEBUI_STAMP}" ]]; then
    return 0
  fi
  if [[ -n "$(find "${UI_DIR}" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.pcss' -o -name '*.css' -o -name '*.html' -o -name '*.json' -o -name '*.proto' -o -name '*.j2' \) -newer "${WEBUI_STAMP}" 2>/dev/null)" ]]; then
    return 0
  fi
  return 1
}

if ui_is_stale; then
  echo "Building WKWebView UI (yarn ${BUILD_SCRIPT})..."
  (
    cd "${PROJECT_ROOT}"
    "${YARN}" "${BUILD_SCRIPT}"
  )
  # `set -e` is in effect inside the subshell sequence: reaching this line
  # means webpack exited 0, so stamp the output as a successful build.
  touch "${WEBUI_STAMP}"
else
  echo "WebUI is up to date - skipping webpack."
fi
