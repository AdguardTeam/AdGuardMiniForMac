#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

# Load toolchain setup
source "`dirname $0`/Support/Scripts/include/configure_toolchain.inc"

# Check for newer version of a git repository.
# Usage: check_latest_version <repo_url> <current_tag> <friendly_name>
check_latest_version() {
    local repo_url="$1"
    local current_tag="$2"
    local name="$3"

    if [ "${SKIP_VERSION_CHECK:-}" = "1" ]; then
        return
    fi

    local latest_tag
    latest_tag=$(git ls-remote --tags --sort=-v:refname "$repo_url" 2>/dev/null \
        | grep -o 'refs/tags/v[0-9][^{}]*$' \
        | head -1 \
        | sed 's|refs/tags/||')

    if [ -n "$latest_tag" ] && [ "$latest_tag" != "$current_tag" ]; then
        echo ""
        echo "========================================================"
        echo "  UPDATE AVAILABLE: $name"
        echo "  Current: $current_tag  →  Latest: $latest_tag"
        echo "========================================================"
        echo ""
        sleep 1
    fi
}

if [ "$1" == "dev" ]; then
    ENV_NAME=Development
else
    ENV_NAME=Production
fi
echo "==== Configure environment for: $ENV_NAME ===="
echo

setup_toolchain

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PRIVATE_DIR="${SCRIPT_DIR}/../sciter-adguard-mini-private"
PRIVATE_SOURCE="${PRIVATE_DIR}/configuration/PrivateConfig.xcconfig"

mkdir -p "${PRIVATE_DIR}/configuration"

# Load environment variables from private .env (dev-only, absent on CI)
PRIVATE_ENV="${PRIVATE_DIR}/.env"
if [ -f "$PRIVATE_ENV" ]; then
    set -a
    source "$PRIVATE_ENV"
    set +a
fi

# Temporarily disable xtrace to prevent secret leakage into logs
_xtrace_saved=
case $- in *x*) _xtrace_saved=1; set +x ;; esac

if [ -n "${CONFIG_BACKEND_REQUEST_KEY:-}" ] && [ -n "${CONFIG_BACKEND_REQUEST_ENCRYPTION_KEY:-}" ]; then
    cat > "$PRIVATE_SOURCE" <<-EOF
	CONFIG_BACKEND_REQUEST_KEY = ${CONFIG_BACKEND_REQUEST_KEY}
	CONFIG_BACKEND_REQUEST_ENCRYPTION_KEY = ${CONFIG_BACKEND_REQUEST_ENCRYPTION_KEY}
EOF
    echo "Generated PrivateConfig from environment variables"
elif [ -f "$PRIVATE_SOURCE" ]; then
    echo "PrivateConfig already exists, keeping existing values"
else
    cat > "$PRIVATE_SOURCE" <<-EOF
	CONFIG_BACKEND_REQUEST_KEY = dummy_request_key
	CONFIG_BACKEND_REQUEST_ENCRYPTION_KEY = dummy_encryption_key
EOF
    echo "Created $PRIVATE_SOURCE with dummy keys"
fi

# Restore xtrace to its original state.
if [ -n "$_xtrace_saved" ]; then
    set -x
fi
unset _xtrace_saved

# Configure Swift package registry for private packages
if [ -z "${SWIFT_REGISTRY_URL:-}" ]; then
    echo "Error: SWIFT_REGISTRY_URL is not set. Configure it in sciter-adguard-mini-private/.env (dev) or CI variables."
    exit 1
fi
swift package-registry set --global --scope mac "${SWIFT_REGISTRY_URL}"

if [[ "$1" == "dev" ]]; then
    # Clone support-scripts

    if [ -z "${SUPPORT_SCRIPTS_GIT:-}" ]; then
        echo "Error: SUPPORT_SCRIPTS_GIT is not set. Configure it in sciter-adguard-mini-private/.env."
        exit 1
    fi
    SUPPORT_SCRIPTS_TAG="v1.3"

    rm -rf support-scripts
    git clone -c advice.detachedHead=false --depth 1 --branch "$SUPPORT_SCRIPTS_TAG" "$SUPPORT_SCRIPTS_GIT" support-scripts
    rm -rf support-scripts/.git

    pushd support-scripts
    bundle config set --local path '../.bundle/vendor'
    bundle install
    popd

    check_latest_version "$SUPPORT_SCRIPTS_GIT" "$SUPPORT_SCRIPTS_TAG" "support-scripts"
fi

if [[ "$1" == "dev" ]]; then
    bundle config --local path '.bundle/vendor'
    bundle config unset --local without
    bundle install

    # Generate Bundler binstubs with bin/ruby shebang
    bundle binstubs --all --force --shebang "$PWD/bin/ruby"
fi

# Activate python venv and install components
echo
echo "Configure Python"
echo
source "`dirname $0`/Support/Scripts/include/configure_python.inc"

if [ "$1" == "dev" ]; then
    # Install Node.js dependencies
    bin/yarn install

    # Install protoc tools
    "`dirname $0`/Support/Scripts/install_protoc_tools.sh"
fi
