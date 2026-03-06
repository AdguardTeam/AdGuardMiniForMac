#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/bin:$PATH"

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

if [ -f ../adguard-mini-private/config.env ]; then
    source ../adguard-mini-private/config.env
fi

if [[ "$1" == "dev" ]]; then
    # Clone support-scripts

    SUPPORT_SCRIPTS_TAG="v1.2"
    if [ -z "$SUPPORT_SCRIPTS_GIT" ]; then
        echo "Error: SUPPORT_SCRIPTS_GIT not set. Source ../adguard-mini-private/config.env or set via environment."
        exit 1
    fi

    rm -rf support-scripts
    git clone -c advice.detachedHead=false --depth 1 --branch "$SUPPORT_SCRIPTS_TAG" "$SUPPORT_SCRIPTS_GIT" support-scripts
    rm -rf support-scripts/.git

    pushd support-scripts
    bundle config set --local path '../.bundle/vendor'
    bundle install
    popd

    check_latest_version "$SUPPORT_SCRIPTS_GIT" "$SUPPORT_SCRIPTS_TAG" "support-scripts"

    # Clone SDD workflows

    SDD_WORKFLOWS_TAG="v1.6.0"
    if [ -z "$SDD_WORKFLOWS_GIT" ]; then
        echo "Error: SDD_WORKFLOWS_GIT not set. Source ../adguard-mini-private/config.env or set via environment."
        exit 1
    else
        SDD_TMP_DIR=$(mktemp -d)
        git clone -c advice.detachedHead=false --depth 1 --branch "$SDD_WORKFLOWS_TAG" "$SDD_WORKFLOWS_GIT" "$SDD_TMP_DIR"

        rm -f .windsurf/workflows/sdd-*.md \
              .windsurf/workflows/doc-*.md \
              .windsurf/workflows/dev-*.md

        cp "$SDD_TMP_DIR"/templates/workflows/*.md .windsurf/workflows/
        rm -rf "$SDD_TMP_DIR"
        echo "SDD workflows updated ($SDD_WORKFLOWS_TAG)"

        check_latest_version "$SDD_WORKFLOWS_GIT" "$SDD_WORKFLOWS_TAG" "SDD workflows"
    fi
fi

bundle config --local path '.bundle/vendor'
bundle config unset --local without

if [ "$1" != "dev" ]; then
    bundle config set --local without 'development'
fi

bundle install

if [ ! ${bamboo_no_need_private_vars} ]; then
    if [ -z "$KEYCHAIN_GIT" ]; then
        echo "Error: KEYCHAIN_GIT not set. Source ../adguard-mini-private/config.env or set via environment."
        exit 1
    fi
    pushd fastlane
    rm -rf keychain
    git clone $KEYCHAIN_GIT
    popd

    bundle exec fastlane create_sens_config
fi

# Activate python venv and install components
echo
echo "Configure Python"
echo
source "`dirname $0`/Support/Scripts/include/configure_python.inc"

if [ "$1" == "dev" ]; then
    # Install protoc tools
    "`dirname $0`/Support/Scripts/install_protoc_tools.sh"

    # syncs certificates for `MAS` distribution
    bundle exec fastlane certs config:MAS
    # syncs certificates for `Standalone` distribution
    bundle exec fastlane certs config:Debug
fi
