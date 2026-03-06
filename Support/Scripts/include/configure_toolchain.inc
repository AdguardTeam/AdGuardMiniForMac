#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

# Toolchain setup for configure.sh
# Validates required tools, checks minimum versions, and generates
# lightweight wrappers in bin/ that bake PATH at generation time.

setup_toolchain() {
    echo "==== Setting up toolchain ===="

    rm -rf bin
    mkdir bin

    # Validate tools exist
    for tool in ruby node yarn; do
        if ! command -v "$tool" &>/dev/null; then
            echo "Error: $tool not found in PATH."
            echo "Required: Ruby 3.2+, Node.js 22+, Yarn 1.22+"
            exit 1
        fi
    done

    # Check Ruby version (minimum 3.2)
    local ruby_version
    ruby_version=$(ruby -e 'puts RUBY_VERSION')
    local ruby_major=${ruby_version%%.*}
    local ruby_minor=${ruby_version#*.}; ruby_minor=${ruby_minor%%.*}

    if [ "$ruby_major" -lt 3 ] || [ "$ruby_major" -eq 3 -a "$ruby_minor" -lt 2 ]; then
        echo "Error: Ruby $ruby_version is too old. Minimum required: 3.2"
        exit 1
    fi

    # Check Node.js version (minimum 22)
    local node_version
    node_version=$(node --version | sed 's/v//')
    local node_major=${node_version%%.*}

    if [ "$node_major" -lt 22 ]; then
        echo "Error: Node.js $node_version is too old. Minimum required: 22"
        exit 1
    fi

    # Generate one-liner wrappers that bake current PATH
    for tool in ruby node yarn; do
        cat > "bin/$tool" <<EOF
#!/bin/sh
exec env LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 PATH="$PATH" $tool "\$@"
EOF
        chmod +x "bin/$tool"
    done

    echo "Toolchain: Ruby $ruby_version, Node $node_version, Yarn $(yarn --version)"
    echo
}
