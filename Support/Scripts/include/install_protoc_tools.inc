# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

# Function to install protoc tools from artifactbundle
install_protoc_tools() {
    local PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
    local TOOLS_DIR="$PROJECT_ROOT/build/protoc-tools"
    local PACKAGE_SWIFT="$PROJECT_ROOT/AdguardMini/MiniResources/ProtoSchema/Package.swift"
    local SWIFT_PROTOBUF_VERSION
    local PROTOC_MAJOR
    local PROTOC_VERSION
    local INSTALLED_SWIFT_VERSION
    local INSTALLED_PROTOC_VERSION
    local PROTOC_BUNDLE_URL
    local PROTOC_ARCH_DIR

    SWIFT_PROTOBUF_VERSION=$(grep -oE 'swift-protobuf\.git.*exact:.*"[0-9]+\.[0-9]+\.[0-9]+"' "$PACKAGE_SWIFT" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

    if [ -z "$SWIFT_PROTOBUF_VERSION" ]; then
        echo "Error: Cannot extract swift-protobuf version from Package.swift"
        exit 1
    fi

    echo "Swift Protobuf version: $SWIFT_PROTOBUF_VERSION"

    # Version resolution priority:
    # 1. PROTOC_VERSION_OVERRIDE environment variable (highest priority)
    # 2. .protoc-version file in project root (for reproducible builds)
    # 3. Dynamic lookup from GitHub API (fallback)
    local PROTOC_VERSION_FILE="$PROJECT_ROOT/.protoc-version"

    if [ -n "${PROTOC_VERSION_OVERRIDE:-}" ]; then
        PROTOC_VERSION="$PROTOC_VERSION_OVERRIDE"
        echo "Using PROTOC_VERSION_OVERRIDE: $PROTOC_VERSION"
    elif [ -f "$PROTOC_VERSION_FILE" ]; then
        PROTOC_VERSION=$(cat "$PROTOC_VERSION_FILE" | tr -d '[:space:]')
        if [ -z "$PROTOC_VERSION" ]; then
            echo "Error: .protoc-version file exists but is empty"
            exit 1
        fi
        echo "Using pinned protoc version from .protoc-version: $PROTOC_VERSION"
    else
        # Documented assumption: Apple releases protoc artifactbundle with version matching
        # swift-protobuf minor version (e.g., swift-protobuf 1.31.x → protoc 31.y)
        # Source: https://github.com/apple/swift-protobuf/releases (observed pattern since 1.28.0)
        # If this assumption breaks, create .protoc-version file or use PROTOC_VERSION_OVERRIDE
        PROTOC_MAJOR=$(echo "$SWIFT_PROTOBUF_VERSION" | cut -d. -f2)

        # Find latest protoc artifactbundle for the major version with deterministic sorting
        echo "Looking for protoc artifactbundle version ${PROTOC_MAJOR}.x..."

        local HTTP_CODE
        local TEMP_JSON=$(mktemp)

        HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_JSON" "https://api.github.com/repos/apple/swift-protobuf/releases")

        if [ "$HTTP_CODE" != "200" ]; then
            echo "Error: Failed to fetch GitHub releases (HTTP $HTTP_CODE)"
            echo ""
            if [ "$HTTP_CODE" = "403" ]; then
                echo "This is likely a GitHub API rate limit."
            elif [ "$HTTP_CODE" = "000" ]; then
                echo "Network error or timeout occurred."
            fi
            echo ""
            echo "To fix this, you can:"
            echo "  1. Create .protoc-version file with version (e.g., echo '31.1' > .protoc-version)"
            echo "  2. Set PROTOC_VERSION_OVERRIDE environment variable"
            echo "  3. Check your network connection and try again"
            rm -f "$TEMP_JSON"
            exit 1
        fi

        # Parse tag_name fields only (more reliable than grepping entire JSON)
        PROTOC_VERSION=$(cat "$TEMP_JSON" \
            | grep -oE '"tag_name":\s*"protoc-artifactbundle-v[0-9]+\.[0-9]+(\.[0-9]+)?"' \
            | grep -oE "protoc-artifactbundle-v${PROTOC_MAJOR}\.[0-9]+(\.[0-9]+)?" \
            | grep -oE "${PROTOC_MAJOR}\.[0-9]+(\.[0-9]+)?" \
            | sort -t. -k1,1n -k2,2n -k3,3n -r \
            | head -1)
        rm -f "$TEMP_JSON"

        if [ -z "$PROTOC_VERSION" ]; then
            echo "Error: Cannot find protoc artifactbundle for swift-protobuf ${SWIFT_PROTOBUF_VERSION}"
            echo ""
            echo "Expected protoc artifactbundle version: ${PROTOC_MAJOR}.x"
            echo "This usually means:"
            echo "  1. Apple hasn't released matching protoc artifactbundle yet"
            echo "  2. The version correlation assumption has changed"
            echo ""
            echo "To fix this, create .protoc-version file: echo '31.1' > .protoc-version"
            echo "Or set: export PROTOC_VERSION_OVERRIDE=31.1"
            echo "Check releases: https://github.com/apple/swift-protobuf/releases"
            exit 1
        fi

        echo "Found protoc version: $PROTOC_VERSION"
        echo "Tip: To pin this version, run: echo '$PROTOC_VERSION' > .protoc-version"
    fi

    if [ -f "$TOOLS_DIR/bin/protoc" ] && [ -f "$TOOLS_DIR/bin/protoc-gen-swift" ]; then
        INSTALLED_SWIFT_VERSION=$("$TOOLS_DIR/bin/protoc-gen-swift" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "")
        INSTALLED_PROTOC_VERSION=$("$TOOLS_DIR/bin/protoc" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1 || echo "")

        if [ "$INSTALLED_SWIFT_VERSION" == "$SWIFT_PROTOBUF_VERSION" ] && [ "$INSTALLED_PROTOC_VERSION" == "$PROTOC_VERSION" ]; then
            echo "protoc-tools already installed (protoc: $INSTALLED_PROTOC_VERSION, protoc-gen-swift: $INSTALLED_SWIFT_VERSION)"
            return 0
        fi
    fi

    # Verify architecture (Apple Silicon only)
    local ARCH=$(uname -m)
    if [ "$ARCH" != "arm64" ]; then
        echo "Error: This script only supports Apple Silicon (arm64)"
        echo "Current architecture: $ARCH"
        echo ""
        echo "If you need Intel Mac support, please update PROTOC_ARCH_DIR"
        echo "in this script to use 'osx-x86_64' instead of 'osx-aarch_64'"
        exit 1
    fi

    echo "Installing protoc-tools:"
    echo "  protoc version: $PROTOC_VERSION"
    echo "  protoc-gen-swift version: $SWIFT_PROTOBUF_VERSION"
    echo "  architecture: $ARCH"

    mkdir -p "$TOOLS_DIR/bin"

    # Use single temp directory for both operations
    local TEMP_DIR=$(mktemp -d)
    local ORIGINAL_DIR=$(pwd)

    PROTOC_BUNDLE_URL="https://github.com/apple/swift-protobuf/releases/download/protoc-artifactbundle-v${PROTOC_VERSION}/protoc-${PROTOC_VERSION}.artifactbundle.zip"

    echo "Downloading protoc ${PROTOC_VERSION}..."
    if ! curl -fL -o "$TEMP_DIR/protoc-bundle.zip" "$PROTOC_BUNDLE_URL"; then
        echo "Error: Failed to download protoc artifactbundle from:"
        echo "  $PROTOC_BUNDLE_URL"
        echo ""
        echo "Please check:"
        echo "  1. The URL is accessible"
        echo "  2. The version $PROTOC_VERSION exists"
        echo "  3. Your network connection"
        exit 1
    fi

    if ! unzip -q "$TEMP_DIR/protoc-bundle.zip" -d "$TEMP_DIR"; then
        echo "Error: Downloaded file is not a valid zip archive"
        echo "This usually means the download was incomplete or the URL returned an error page"
        exit 1
    fi

    PROTOC_ARCH_DIR="protoc-${PROTOC_VERSION}-osx-aarch_64"
    local PROTOC_BIN_PATH="$TEMP_DIR/protoc-${PROTOC_VERSION}.artifactbundle/$PROTOC_ARCH_DIR/bin/protoc"
    local PROTOC_INCLUDE_PATH="$TEMP_DIR/protoc-${PROTOC_VERSION}.artifactbundle/$PROTOC_ARCH_DIR/include"

    if [ ! -f "$PROTOC_BIN_PATH" ]; then
        echo "Error: Expected protoc binary not found in artifactbundle"
        echo "Expected path: $PROTOC_BIN_PATH"
        echo ""
        echo "This may indicate:"
        echo "  1. The artifactbundle structure has changed"
        echo "  2. The architecture directory name has changed"
        echo "  3. The downloaded bundle is corrupted"
        exit 1
    fi

    if [ ! -d "$PROTOC_INCLUDE_PATH" ]; then
        echo "Error: Expected protoc include directory not found in artifactbundle"
        echo "Expected path: $PROTOC_INCLUDE_PATH"
        exit 1
    fi

    cp "$PROTOC_BIN_PATH" "$TOOLS_DIR/bin/"
    cp -R "$PROTOC_INCLUDE_PATH" "$TOOLS_DIR/"
    chmod +x "$TOOLS_DIR/bin/protoc"

    echo "Building protoc-gen-swift ${SWIFT_PROTOBUF_VERSION}..."
    cd "$TEMP_DIR"

    if ! git clone -q --depth 1 --branch "$SWIFT_PROTOBUF_VERSION" https://github.com/apple/swift-protobuf.git; then
        echo "Error: Failed to clone swift-protobuf repository"
        echo "Branch/tag: $SWIFT_PROTOBUF_VERSION"
        exit 1
    fi

    cd swift-protobuf

    if ! swift build -c release; then
        echo "Error: Failed to build protoc-gen-swift"
        echo "Check Swift toolchain installation and try again"
        exit 1
    fi

    local PROTOC_GEN_SWIFT_BIN=".build/release/protoc-gen-swift"
    if [ ! -f "$PROTOC_GEN_SWIFT_BIN" ]; then
        echo "Error: protoc-gen-swift binary not found after build"
        echo "Expected path: $PROTOC_GEN_SWIFT_BIN"
        echo "Build may have succeeded but output is in unexpected location"
        exit 1
    fi

    cp "$PROTOC_GEN_SWIFT_BIN" "$TOOLS_DIR/bin/"
    chmod +x "$TOOLS_DIR/bin/protoc-gen-swift"

    # Cleanup temp directory
    cd "$ORIGINAL_DIR"
    rm -rf "$TEMP_DIR"

    echo "protoc-tools installed to $TOOLS_DIR"
    "$TOOLS_DIR/bin/protoc" --version
    "$TOOLS_DIR/bin/protoc-gen-swift" --version
}
