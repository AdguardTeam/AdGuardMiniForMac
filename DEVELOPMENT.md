<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# Development Guide

## Table of Contents

- [Prerequisites](#prerequisites)
  - [Required Tools](#required-tools)
  - [Repository Access](#repository-access)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
  - [Code Style](#code-style)
  - [Frontend Development](#frontend-development)
  - [Linting](#linting)
  - [Testing](#testing)
  - [Building](#building)
- [Common Tasks](#common-tasks)
  - [Protobuf Schema](#protobuf-schema)
  - [Localization](#localization)
  - [Update Dependencies](#update-dependencies)
  - [Utility Scripts](#utility-scripts)
  - [Theme Generation](#theme-generation)
- [Troubleshooting](#troubleshooting)
  - [Ruby or Node.js Version Too Old](#ruby-or-nodejs-version-too-old)
  - [Tests Don't Build](#tests-dont-build)
  - [Can't See the Build in TestFlight](#cant-see-the-build-in-testflight)
  - [Get New Updates Immediately (Sparkle)](#get-new-updates-immediately-sparkle)
- [Additional Resources](#additional-resources)

## Prerequisites

### Required Tools

| Tool | Version | Notes |
|------|---------|-------|
| Xcode | 26+ | Required for `.icon` asset format |
| Node.js | 22+ | JavaScript runtime (used by Yarn, Webpack, Sciter UI build) |
| Ruby | 3.2.2+ | Build scripts, RuboCop, ruby-lsp |
| Bundler | 2.6+ | Ruby dependency management |
| Yarn | 1.22+ | Frontend dependency management |
| Python | 3.9+ | Protobuf schema generation (venv created by `configure.sh`) |

- **Minimum deployment target** (end-user): **macOS 12** (`AG_DEPLOYMENT_TARGET`
  in `CommonConfig.xcconfig`)
- **Minimum development machine**: **macOS 26+** (required for Xcode 26)

### Repository Access

Private Swift packages are resolved through a **Swift package registry**
(configured by `configure.sh` via `swift package-registry set --global --scope
mac`), not via Bitbucket/SSH checkouts. The registry URL is provided through the
`SWIFT_REGISTRY_URL` variable (see below). The following private packages are
served from the registry under the `mac` scope:

- `mac.aml` (AdGuard Mac library)
- `mac.sp-appstore`
- `mac.sp-backend`
- `mac.sp-color-palette`
- `mac.sp-flm`
- `mac.sp-sentry`
- `mac.sp-xpcgate`

Public dependencies (SafariConverterLib, Sparkle, FilterListManager,
swift-protobuf, SwiftLintPlugins, XMLCoder, etc.) are resolved from GitHub.

Additionally, a private configuration directory named
`sciter-adguard-mini-private` must exist at the same directory level as the
`sciter-adguard-mini` repository. It provides a `.env` file consumed by
`configure.sh` with at least:

- `SWIFT_REGISTRY_URL` — URL of the private Swift package registry
- `SUPPORT_SCRIPTS_GIT` — git URL of the `support-scripts` repository
- `CONFIG_BACKEND_REQUEST_KEY` / `CONFIG_BACKEND_REQUEST_ENCRYPTION_KEY` —
  backend keys (dummy values are used automatically when absent)

You can bootstrap it from the `sciter-adguard-mini-private-template` folder in this
repository.

## Getting Started

1. **Clone the repository** and ensure `sciter-adguard-mini-private` is at the
   same directory level as `sciter-adguard-mini`:

   ```text
   Projects/
   ├── sciter-adguard-mini/
   └── sciter-adguard-mini-private/
   ```

2. **Initialize the development environment:**

   ```bash
   ./configure.sh dev
   ```

   This command will:
   - Capture toolchain (Ruby, Bundler, Node, Yarn) and generate wrappers in `bin/`
   - Load variables from `sciter-adguard-mini-private/.env` and generate
     `PrivateConfig.xcconfig`
   - Configure the private Swift package registry (`SWIFT_REGISTRY_URL`)
   - Clone the `support-scripts` repository (`SUPPORT_SCRIPTS_GIT`) and install
     its Ruby gems
   - Install Ruby gems via Bundler and generate binstubs
   - Create a Python virtual environment (`.venv/`) and install pip packages
   - Install local protoc tools (`protoc` + `protoc-gen-swift`) into
     `build/protoc-tools/`
   - Install Node.js dependencies (`yarn install`)

   > **Note:** After running `configure.sh`, all Ruby and Node.js tools are
   > invoked via wrappers in `bin/` (e.g., `bin/ruby`, `bin/yarn`). This
   > ensures consistent tool versions regardless of your shell configuration.

3. **Install frontend dependencies** (already done by `configure.sh dev`; run
   manually only to reinstall):

   ```bash
   yarn
   ```

4. **Build the project** in Xcode: open `AdguardMini/AdguardMini.xcodeproj`
   and build the `AdguardMini` scheme.

   > **Note:** The UI is built by webpack (`yarn build:dev` / `yarn build:prod`)
   > into `AdguardMini/MiniResources/WebUI/` (per-module `*.html` +
   > `*.app.js` + `*.css`). The Xcode build phase copies this folder into the
   > app bundle; the Swift WKWebView host loads each module's HTML via
   > `Bundle.main.url(forResource:withExtension:)`. For hot-reload
   > development, `yarn syncUI` / `yarn watchProject` inject the freshly built
   > bundle into the already built `.app` and relaunch it, so no Xcode rebuild
   > is needed for UI-only changes. No manual UI build step is required for a
   > release build that uses the committed `WebUI/` artifacts.

## Development Workflow

### Code Style

- **Swift**: SwiftLint (config at `AdguardMini/.swiftlint.yml`)
- **TypeScript**: ESLint (config at `AdguardMini/ui/scripts/lint/prod.mjs`)
- **Pre-commit hook**: Husky runs `lint-staged` on TypeScript files automatically

For code guidelines and architectural conventions, see [AGENTS.md](./AGENTS.md).

### Frontend Development

```bash
# Development build (one-time)
yarn build:dev

# Watch mode — rebuilds on file changes
yarn start

# One-shot hot-swap — builds the UI, injects it into the existing built .app
# (no Xcode rebuild) and relaunches the app
yarn syncUI

# Continuous hot-swap — webpack watch + inject into the existing build
# Terminal 1:
yarn start
# Terminal 2:
yarn watchProject
```

### Linting

```bash
# Run ESLint on TypeScript sources
yarn lint

# Auto-fix ESLint issues
yarn lint:fix
```

### Testing

Swift tests can be run from Xcode (target: `AdguardMiniTests`) or from the
terminal via `xcodebuild`:

```bash
# Swift: run the XCTest suite from the terminal
xcodebuild test \
  -project AdguardMini/AdguardMini.xcodeproj \
  -scheme AdguardMiniTests \
  -configuration Release \
  -skipPackagePluginValidation \
  CODE_SIGNING_ALLOWED=NO

# TypeScript: run node:test suites (compiles tsconfig.node-tests.json first)
yarn test:node
```

> **Note:** In CI, the same Swift test command is run via the shared
> `AdGuardSoftwareLimited/actions/.github/workflows/junit-tests.yml` workflow
> (see `.github/workflows/pr-check.yml`).

### Building

For day-to-day development, build from Xcode: open
`AdguardMini/AdguardMini.xcodeproj` and build the `AdguardMini` scheme. The
Sciter UI is built automatically as a target dependency.

```bash
# Production build of the WKWebView UI bundle (emits AdguardMini/MiniResources/WebUI/)
yarn build:prod

# Build the native debug app from the terminal via xcodebuild.
# `Debug-Standalone` is the native debug configuration (backed by
# ConfigNative.xcconfig); `Debug` is not a valid configuration name.
xcodebuild -project AdguardMini/AdguardMini.xcodeproj -scheme AdguardMini -configuration Debug-Standalone build
```

Release, Standalone (Developer ID), and MAS builds are produced in CI via
GitHub Actions. See the workflows in `.github/workflows/`:
`build-standalone.yml`, `build-mas.yml`, `build-variant.yml`, and
`pr-check.yml`.

## Common Tasks

### Protobuf Schema

The app uses Protobuf for Swift ↔ TypeScript communication.

| Path | Description |
|------|-------------|
| `AdguardMini/ui/schema/` | Schema definitions (`.proto` files) |
| `AdguardMini/ui/schema/.protocfg/` | Generator configs (swift.json, typescript.json) |
| `AdguardMini/MiniResources/ProtoSchema/Sources/` | Generated Swift code |
| `AdguardMini/ui/modules/common/apis/` | Generated TypeScript code |

Regenerate after modifying `.proto` files:

```bash
./Support/Scripts/update_proto_schema.sh
```

This wrapper ensures the local protoc tools (`build/protoc-tools/`) are on
`PATH` and then runs `AdguardMini/Scripts/updateProtoSchema.sh`.

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

Third-party dependencies can be updated via:

```bash
bundle exec ruby Support/Scripts/update_third_party_deps.rb
```

To check for updates without applying:

```bash
bundle exec ruby Support/Scripts/update_third_party_deps.rb --dry-run
```

To update specific packages:

```bash
bundle exec ruby Support/Scripts/update_third_party_deps.rb \
  --packages=assistant,safariconverterlib
```

> **IMPORTANT**: SafariConverterLib and @adguard/safari-extension versions
> **MUST** always be exactly the same for compatibility. The script
> automatically syncs both, but if you update manually, verify they match.

### Utility Scripts

All scripts are located in `Support/Scripts/`.

| Script | Description |
|--------|-------------|
| `flush_adguard_mini_data.sh` | Cleans all AdGuard Mini data (settings, keychain, group containers), restoring to first-run state |
| `move_templates.sh` | Installs Xcode file templates (available under `macOS/AdGuardMini related` in New → File) |
| `install_protoc_tools.sh` | Installs local protoc tools into `build/protoc-tools/` |
| `update_proto_schema.sh` | Regenerates Swift/TypeScript Protobuf schema (see Protobuf Schema section) |
| `update_third_party_deps.rb` | Updates npm and SPM dependencies (see Update Dependencies section) |
| `locales.sh` | Pushes/pulls localization strings (see Localization section) |

### Theme Generation

```bash
yarn theme:generate
```

Generates CSS stylesheets from the default theme definition at
`AdguardMini/ui/modules/common/theme/default`.

## Troubleshooting

### Ruby or Node.js Version Too Old

If `configure.sh` reports that your Ruby or Node.js version is too old:

1. Install the required versions (Ruby 3.2+, Node.js 22+)
2. Ensure they are available in your current shell
3. Run `./configure.sh dev` again to capture the new toolchain

The toolchain wrappers in `bin/` will use whatever versions were active when
`configure.sh` was run, so you don't need to modify shell profiles.

### Tests Don't Build

Switch to the test target in Xcode and try building locally. Add the missing
source files to the appropriate target membership.

### Can't See the Build in TestFlight

If the TestFlight deployment was successful but no build is displayed for a long
time, it may be due to validation issues with the application package. An email
describing the problem is sent to certain categories of related users, such as
project managers.

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
- [.github/workflows/](./.github/workflows/) — CI/CD pipelines (build, test,
  and deploy)
- [Production build and deploy](./docs/production-build-and-deploy.md) —
  release channels, build variants, pipeline overview, and the release
  checklist
