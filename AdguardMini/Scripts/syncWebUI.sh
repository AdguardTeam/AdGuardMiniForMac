#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

#
#  syncWebUI.sh
#  AdguardMini
#
#  Injects a freshly built WebUI bundle into an already built .app without
#  running a full Xcode build, then relaunches the app.
#
#  Pipeline:
#    1. Locate an existing built app (DerivedData / repo `build/` / --app).
#    2. Build the UI with webpack (skipped with --no-build).
#    3. Quit the running app.
#    4. rsync AdguardMini/MiniResources/WebUI -> <App>/Contents/Resources/WebUI.
#    5. Re-sign the app bundle (resource changes break the code signature seal).
#    6. Relaunch the app.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${PROJECT_DIR}/.." && pwd)"

PROJECT_NAME="AdguardMini"
WEBUI_SRC="${PROJECT_DIR}/MiniResources/WebUI"

CONFIGURATION="Debug-Standalone"
APP_PATH="${ADGUARD_MINI_APP:-}"
DO_BUILD=1
BUILD_SCRIPT="build:dev"
DO_RESTART=1
DO_SIGN=1
DO_XCODEBUILD=1

log() { printf '[syncWebUI] %s\n' "$*"; }
fail() { printf '[syncWebUI] error: %s\n' "$*" >&2; exit 1; }

usage() {
    cat <<'EOF'
Usage: AdguardMini/Scripts/syncWebUI.sh [options]

Rebuilds the WKWebView UI bundle and injects it into an existing built
.app (no Xcode rebuild), then relaunches the app.

Options:
  --no-build            Do not run webpack; reuse the current
                        MiniResources/WebUI output (use together with
                        `yarn start` watch mode).
  --prod                Build the UI with `yarn build:prod` (default: build:dev).
  --no-restart          Do not quit/relaunch the app, only sync resources.
  --no-sign             Do not re-sign the app bundle after syncing.
  --no-xcodebuild       Fail instead of falling back to a full `xcodebuild`
                        when no built app can be found.
  --app <path>          Explicit path to the .app bundle to patch.
  --configuration <cfg> Build configuration to prefer (default: Debug-Standalone).
  -h, --help            Show this help.

Environment:
  ADGUARD_MINI_APP      Same as --app.
  DERIVED_DATA_PATH     Override the DerivedData search root.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-build) DO_BUILD=0 ;;
        --prod) BUILD_SCRIPT="build:prod" ;;
        --no-restart) DO_RESTART=0 ;;
        --no-sign) DO_SIGN=0 ;;
        --no-xcodebuild) DO_XCODEBUILD=0 ;;
        --app) shift; [[ $# -gt 0 ]] || fail "--app requires a path"; APP_PATH="$1" ;;
        --configuration) shift; [[ $# -gt 0 ]] || fail "--configuration requires a value"; CONFIGURATION="$1" ;;
        -h|--help) usage; exit 0 ;;
        *) usage >&2; fail "unknown option: $1" ;;
    esac
    shift
done

# Resolves the DerivedData root, honoring a custom Xcode location if one is set.
derived_data_root() {
    if [[ -n "${DERIVED_DATA_PATH:-}" ]]; then
        printf '%s' "${DERIVED_DATA_PATH}"
        return
    fi

    local custom
    custom="$(defaults read com.apple.dt.Xcode IDECustomDerivedDataLocation 2>/dev/null || true)"
    if [[ -n "${custom}" && -d "${custom}" ]]; then
        printf '%s' "${custom}"
        return
    fi

    printf '%s' "${HOME}/Library/Developer/Xcode/DerivedData"
}

# Prints the most recently modified app bundle among the given candidates,
# preferring product bundles over helper/watchdog ones.
pick_app_bundle() {
    local candidates=("$@")
    [[ ${#candidates[@]} -gt 0 ]] || return 1

    local preferred=()
    local app
    for app in "${candidates[@]}"; do
        case "$(basename "${app}")" in
            *Watchdog*|*watchdog*|*Helper*) continue ;;
        esac
        preferred+=("${app}")
    done
    [[ ${#preferred[@]} -gt 0 ]] || preferred=("${candidates[@]}")

    # `ls -td` sorts by modification time, newest first.
    { ls -td "${preferred[@]}" 2>/dev/null || true; } | head -1
}

# Locates a built .app bundle, preferring the requested configuration and
# falling back to the newest app of any configuration when it is missing.
find_app_bundle() {
    local derived_data
    derived_data="$(derived_data_root)"

    local candidates=()
    local app

    if [[ -d "${derived_data}" ]]; then
        while IFS= read -r app; do
            [[ -n "${app}" ]] && candidates+=("${app}")
        done < <(find "${derived_data}" -maxdepth 5 -type d -name '*.app' \
            -path "*/${PROJECT_NAME}-*/Build/Products/${CONFIGURATION}/*" 2>/dev/null)

        # Xcode may have built a different configuration than requested (for
        # example Debug-MAS or Release-Standalone), so fall back to the newest
        # app of any configuration to keep the tool working without extra flags.
        if [[ ${#candidates[@]} -eq 0 ]]; then
            while IFS= read -r app; do
                [[ -n "${app}" ]] && candidates+=("${app}")
            done < <(find "${derived_data}" -maxdepth 5 -type d -name '*.app' \
                -path "*/${PROJECT_NAME}-*/Build/Products/*/*" 2>/dev/null)
        fi
    fi

    if [[ -d "${ROOT_DIR}/build/${CONFIGURATION}" ]]; then
        while IFS= read -r app; do
            [[ -n "${app}" ]] && candidates+=("${app}")
        done < <(find "${ROOT_DIR}/build/${CONFIGURATION}" -maxdepth 1 -type d -name '*.app' 2>/dev/null)
    fi

    # Bash 3.2 (system bash) errors on expanding an empty array under `set -u`.
    [[ ${#candidates[@]} -gt 0 ]] || return 1

    pick_app_bundle "${candidates[@]}"
}

# Runs a full Xcode build when no prebuilt app is available.
run_xcodebuild() {
    log "No existing ${CONFIGURATION} build found, running a full xcodebuild (first run only)..."
    # Pin the DerivedData location: command-line `xcodebuild` does not reliably
    # honor the GUI `IDECustomDerivedDataLocation` preference, so without
    # `-derivedDataPath` the build would land in the default DerivedData dir
    # and `find_app_bundle` (which searches `derived_data_root`) would fail.
    xcodebuild \
        -project "${PROJECT_DIR}/${PROJECT_NAME}.xcodeproj" \
        -scheme "${PROJECT_NAME}" \
        -configuration "${CONFIGURATION}" \
        -derivedDataPath "$(derived_data_root)" \
        build
}

# Builds the TypeScript UI with webpack via the captured yarn wrapper.
build_web_ui() {
    local yarn_bin="${ROOT_DIR}/bin/yarn"
    [[ -x "${yarn_bin}" ]] || yarn_bin="yarn"

    log "Building web UI (yarn ${BUILD_SCRIPT})..."
    (cd "${ROOT_DIR}" && "${yarn_bin}" "${BUILD_SCRIPT}")
}

# Quits the app bundle at $1 and waits for its process to disappear.
quit_app() {
    local app="$1"
    local bundle_id
    bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "${app}/Contents/Info.plist" 2>/dev/null || true)"

    if [[ -n "${bundle_id}" ]]; then
        log "Quitting ${bundle_id}..."
        osascript -e "quit app id \"${bundle_id}\"" >/dev/null 2>&1 || true
    fi

    local executable_dir="${app}/Contents/MacOS/"
    local attempt
    # `pgrep -f`/`pkill -f` treat the argument as an extended regex, but
    # `executable_dir` is a raw filesystem path; escape regex metacharacters
    # so a custom DerivedData path cannot mis-match or over-match.
    local pattern
    pattern="$(printf '%s' "${executable_dir}" | sed 's/[][(){}*+?.^$|\\]/\\&/g')"
    # Graceful quit goes through `applicationShouldTerminate`, which (when
    # protection is enabled) shows the quit-confirmation alert and waits for
    # user input. Give the app a generous window (30s) before force-killing so
    # unsaved state (e.g. an open user-rules editor) is not silently discarded.
    for attempt in $(seq 1 120); do
        pgrep -f "${pattern}" >/dev/null 2>&1 || return 0
        /bin/sleep 0.25
    done

    log "App did not quit gracefully (30s exceeded), terminating it..."
    pkill -f "${pattern}" >/dev/null 2>&1 || true
}

# Copies the freshly built WebUI folder into the app bundle resources.
sync_web_ui() {
    local app="$1"
    local destination="${app}/Contents/Resources/WebUI"

    log "Syncing WebUI -> ${destination}"
    mkdir -p "${destination}"
    rsync -a --delete "${WEBUI_SRC}/" "${destination}/"
}

# Re-signs the app bundle, because changing resources invalidates the seal.
resign_app() {
    local app="$1"
    local identity
    local signature_info

    # An unsigned bundle makes `codesign -dvv` exit non-zero; `pipefail` would
    # abort the script, so the failure is swallowed here.
    signature_info="$({ codesign -dvv "${app}" 2>&1 || true; })"

    if [[ "${signature_info}" == *"not signed at all"* ]]; then
        log "App is not code signed, nothing to re-sign."
        return 0
    fi

    identity="$(printf '%s\n' "${signature_info}" | awk -F= '/^Authority=/ { print $2; exit }')"
    [[ -n "${identity}" ]] || identity="-"

    log "Re-signing app with identity: ${identity}"
    # Preserve `runtime` (hardened runtime) in both attempts: dropping it from
    # the fallback would clear the hardened-runtime flag, weakening the app's
    # protections. The second attempt retries anyway in case the first failed
    # for a non-metadata reason.
    local preserve="identifier,entitlements,flags,requirements,runtime"
    if ! codesign --force --preserve-metadata="${preserve}" --sign "${identity}" "${app}" >/dev/null 2>&1; then
        if ! codesign --force --preserve-metadata="${preserve}" --sign "${identity}" "${app}" >/dev/null 2>&1; then
            log "warning: re-signing failed; the app may refuse to launch. Do a full Xcode build if so."
        fi
    fi
}

APP_BUNDLE="${APP_PATH}"
if [[ -z "${APP_BUNDLE}" ]]; then
    APP_BUNDLE="$(find_app_bundle || true)"
fi

if [[ -z "${APP_BUNDLE}" || ! -d "${APP_BUNDLE}" ]]; then
    [[ ${DO_XCODEBUILD} -eq 1 ]] || fail "no built ${CONFIGURATION} app found (use --app or build in Xcode first)"
    run_xcodebuild
    APP_BUNDLE="$(find_app_bundle || true)"
    [[ -n "${APP_BUNDLE}" && -d "${APP_BUNDLE}" ]] || fail "still cannot find a built app after xcodebuild"
fi

log "Target app: ${APP_BUNDLE}"

if [[ ${DO_BUILD} -eq 1 ]]; then
    build_web_ui
fi

# Verify the staged WebUI actually contains a build before syncing: webpack's
# `output.clean: true` wipes the dir before emitting, so a failed/interrupted
# build would empty it and `rsync --delete` would then delete the app's working
# WebUI (requiring a full rebuild to recover).
[[ -d "${WEBUI_SRC}" ]] || fail "${WEBUI_SRC} is missing. Run 'yarn build:dev' first."
for module in tray settings onboarding userrules; do
    [[ -s "${WEBUI_SRC}/${module}.html" ]] \
        || fail "${WEBUI_SRC}/${module}.html is missing or empty; run 'yarn build:dev' first."
done

if [[ ${DO_RESTART} -eq 1 ]]; then
    quit_app "${APP_BUNDLE}"
fi

sync_web_ui "${APP_BUNDLE}"

if [[ ${DO_SIGN} -eq 1 ]]; then
    resign_app "${APP_BUNDLE}"
fi

if [[ ${DO_RESTART} -eq 1 ]]; then
    log "Launching app..."
    open "${APP_BUNDLE}"
fi

log "Done."
