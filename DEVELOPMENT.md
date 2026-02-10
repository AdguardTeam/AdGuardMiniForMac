<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# Development Guide

## Prerequisites

### Required Tools

| Tool | Version | Notes |
|------|---------|-------|
| Xcode | 26+ | Required for `.icon` asset format |
| Node.js | 22+ | JavaScript runtime (used by Yarn, Webpack, Sciter UI build) |
| Ruby | 3.2.2+ | Fastlane and build scripts |
| Bundler | 2.6+ | Ruby dependency management |
| Yarn | 1.22+ | Frontend dependency management |
| Python | 3.9+ | Protobuf schema generation (venv created by `configure.sh`) |

- **Minimum deployment target** (end-user): **macOS 12** (`AG_DEPLOYMENT_TARGET`
  in `CommonConfig.xcconfig`)
- **Minimum development machine**: **macOS 26+** (required for Xcode 26)

### Repository Access

SSH access to the internal Bitbucket server is required. The following private
repositories are resolved as SPM dependencies during build:

- `adguard-mac-lib`
- `sp-appstore`
- `sp-backend`
- `sp-color-palette` (+ transitive: `sp-swiftlint`)
- `sp-flm`
- `sp-sciter-sdk`
- `sp-sentry`
- `sp-xpcgate`

Additionally, `adguard-mini-private` must be cloned at the same directory level
as `adguard-mini` (or create it manually from the
`adguard-mini-private-template` folder).

## Getting Started

1. **Clone the repository** and ensure `adguard-mini-private` is at the same
   directory level as `adguard-mini`:

   ```text
   Projects/
   ├── adguard-mini/
   └── adguard-mini-private/
   ```

2. **Initialize the development environment:**

   ```bash
   ./configure.sh dev
   ```

   This command will:
   - Install Ruby gems via Bundler
   - Load credentials from `adguard-mini-private`
   - Create a Python virtual environment (`.venv/`) and install pip packages
   - Install local protoc tools (`protoc` + `protoc-gen-swift`) into
     `build/protoc-tools/`
   - Sync certificates for MAS and Standalone distributions

3. **Install frontend dependencies:**

   ```bash
   yarn
   ```

4. **Build the project** in Xcode: open `AdguardMini/AdguardMini.xcodeproj`
   and build the `AdguardMini` scheme.

   > **Note:** Sciter UI is built automatically as an Xcode target dependency
   > (`Build Sciter UI` legacy target). It tracks changes in `sciter-ui/` and
   > rebuilds `resources.bin` only when needed. No manual UI build step is
   > required.

## Development Workflow

### Code Style

- **Swift**: SwiftLint (config at `AdguardMini/.swiftlint.yml`)
- **TypeScript**: ESLint (config at `AdguardMini/sciter-ui/scripts/lint/prod.mjs`)
- **Pre-commit hook**: Husky runs `lint-staged` on TypeScript files automatically

For code guidelines and architectural conventions, see [AGENTS.md](./AGENTS.md).

### Frontend Development

```bash
# Development build (one-time)
yarn build:dev

# Watch mode — rebuilds on file changes
yarn start

# Hot-reload — rebuilds UI and restarts the app
# Terminal 1:
yarn start
# Terminal 2:
yarn watchProject

# Build user rules module separately
yarn build:userRules

# Webpack dev server (web build mode, for browser debugging)
yarn devserver
```

### Linting

```bash
# Run ESLint on TypeScript sources
yarn lint

# Auto-fix ESLint issues
yarn lint:fix
```

### Testing

```bash
# Swift: run XCTest suite from Xcode (target: AdguardMiniTests)

# Swift: run tests via Fastlane
bundle exec fastlane test
```

### Building

```bash
# Production build of Sciter UI
yarn build:prod

# Build via Fastlane (various configurations)
bundle exec fastlane build config:Debug
bundle exec fastlane build config:Release
bundle exec fastlane build config:MAS
```

## Common Tasks

### Protobuf Schema

The app uses Protobuf for Swift ↔ TypeScript communication.

| Path | Description |
|------|-------------|
| `AdguardMini/sciter-ui/schema/` | Schema definitions (`.proto` files) |
| `AdguardMini/sciter-ui/schema/.protocfg/` | Generator configs (swift.json, typescript.json) |
| `AdguardMini/SciterResources/SciterSchema/Sources/` | Generated Swift code |
| `AdguardMini/sciter-ui/modules/common/apis/` | Generated TypeScript code |

Regenerate after modifying `.proto` files:

```bash
bundle exec fastlane update_proto_schema
```

**Version pinning (optional):** To ensure reproducible protoc builds:

```bash
echo '31.1' > .protoc-version
```

### Localization

The project supports 35 languages via TwoSky. Base locale is English.

```bash
# Pull all translations (Swift + TypeScript)
./Support/Scripts/locales.sh

# Push Swift base locale to TwoSky
./Support/Scripts/locales.sh push

# Pull TypeScript translations
yarn locales:pull

# Push TypeScript base locale
yarn locales:pushMaster

# Validate locale files
yarn locales:check
```

### Update Dependencies

```bash
# Update all dependencies
bundle exec fastlane update_third_party_deps

# Update specific packages (available: assistant, safari-extension, safariconverterlib)
bundle exec fastlane update_third_party_deps packages:assistant,safariconverterlib

# Check for updates without applying
bundle exec fastlane update_third_party_deps dry_run:true
```

> **IMPORTANT**: SafariConverterLib and @adguard/safari-extension versions
> **MUST** always be exactly the same for compatibility. After running
> `update_third_party_deps`, you MUST manually verify and synchronize versions:
>
> 1. Check SafariConverterLib version in Xcode Project → Package Dependencies
> 2. Check @adguard/safari-extension version in
>    `AdguardMini/PopupExtension/ContentScript/package.json`
> 3. **Manually update** the mismatched version to ensure they are identical

For detailed Fastlane options, see `fastlane/README.md`.

### Utility Scripts

All scripts are located in `Support/Scripts/`.

| Script | Description |
|--------|-------------|
| `flush_adguard_mini_data.sh` | Cleans all AdGuard Mini data (settings, keychain, group containers), restoring to first-run state |
| `move_templates.sh` | Installs Xcode file templates (available under `macOS/AdGuardMini related` in New → File) |
| `increment-some-number.sh` | Modifies version or build number components |
| `locales.sh` | Pushes/pulls localization strings (see Localization section) |

### Theme Generation

```bash
yarn theme:generate
```

Generates CSS stylesheets from the default theme definition at
`AdguardMini/sciter-ui/modules/common/theme/default`.

## Troubleshooting

### Ruby Version Too Old

Install Ruby via Homebrew and add it to PATH:

```bash
brew install ruby
echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
```

### Tests Don't Build

Switch to the test target in Xcode and try building locally. Add the missing
source files to the appropriate target membership.

### Can't See the Build in TestFlight

If the TestFlight deployment was successful but no build is displayed for a long
time, it may be due to validation issues with the application package. An email
describing the problem is sent to certain categories of related users, such as
project managers.

The last known problems were related to invalid `sciter` `dylib` entitlements.
See the `sp-sciter-sdk` repository for more information.

### Get New Updates Immediately (Sparkle)

To join the first update group and receive version information without waiting
for the phased rollout interval:

```bash
# For Standalone nightly/beta/release builds
defaults write com.adguard.safari.AdGuard SUUpdateGroupIdentifier -int 2009
# For Dev builds
defaults write com.adguard.safari.AdGuard.Dev SUUpdateGroupIdentifier -int 2009
```

## Additional Resources

- [AGENTS.md](./AGENTS.md) — Project context, code guidelines, and
  contribution rules
- [README.md](./README.md) — Product overview and user documentation
- [fastlane/README.md](./fastlane/README.md) — Full Fastlane lane
  documentation (auto-generated)
