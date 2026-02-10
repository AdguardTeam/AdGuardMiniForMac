<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# AGENTS

## Project Overview

AdGuard Mini (formerly AdGuard for Safari) is a macOS ad-blocking application
for Safari. It consists of a platform layer written in Swift (main app + Safari
extensions) and a UI layer written in TypeScript (Preact/MobX modules rendered
via Sciter runtime). The app uses Safari Content Blocker and Web Extension APIs
to block ads, trackers, and annoyances. It also includes a Safari popup
extension for in-browser controls and a Protobuf-based schema for Swift/TS data
synchronization.

## Technical Context

- **Language/Version**: Swift 5.9+ (platform), TypeScript 5.x (UI)
- **Primary Dependencies**:
    - Swift: Sparkle (updates), XMLCoder, FilterListManager (AdGuardFLM),
      Sciter SDK, Sentry
    - TypeScript: Preact, MobX, Webpack, google-protobuf,
      @adguard/rules-editor, @adg/sciter-utils-kit
- **Storage**: UserDefaults, file-based storage (JSON/plist), Safari Content
  Blocker rules (JSON)
- **Testing**: XCTest (Swift), Jest (TypeScript)
- **Target Platform**: macOS 12+ (deployment), macOS 13+ (development machine),
  Safari extensions
- **Project Type**: single (Xcode project with multiple targets)
- **Performance Goals**: N/A
- **Constraints**: Safari Content Blocker API limits (max rules per extension),
  App Sandbox, Hardened Runtime
- **Scale/Scope**: Consumer macOS application distributed via App Store and
  standalone builds

## Project Structure

```text
adguard-mini/
├── AdguardMini/                          # Xcode project root
│   ├── AdguardMini.xcodeproj/            # Xcode project file
│   ├── AdguardMini/                      # Main app target
│   │   ├── DI/                           # Dependency injection containers
│   │   ├── Sources/                      # App source code
│   │   │   ├── Backend/                  # Backend API communication
│   │   │   ├── Core/                     # Core services and protocols
│   │   │   ├── Filters/                  # Filter management and Safari integration
│   │   │   ├── Sciter/                   # Sciter runtime bridge
│   │   │   ├── Licensing/                # License management
│   │   │   ├── AppStore/                 # App Store / in-app purchase
│   │   │   ├── SafariExtensions/         # Safari extension management
│   │   │   ├── ImportExport/             # Settings import/export
│   │   │   └── Utils/                    # Utility classes
│   │   ├── Resources/                    # Assets, plists, configs
│   │   └── Localization/                 # Swift localization strings
│   ├── PopupExtension/                   # Safari popup extension (toolbar UI)
│   │   ├── Popup/                        # Popup view and view model
│   │   ├── AGSEDesignSystem/             # Design system components
│   │   ├── ContentScript/                # Injected content scripts (npm)
│   │   ├── AdvancedBlocking/             # Advanced blocking logic
│   │   └── ExtensionSafariApi/           # Safari API bridge
│   ├── WebExtension/                     # Safari web extension
│   ├── GeneralContentBlocker/            # Content blocker: general ads
│   ├── PrivacyContentBlocker/            # Content blocker: privacy/trackers
│   ├── SecurityContentBlocker/           # Content blocker: security threats
│   ├── SocialContentBlocker/             # Content blocker: social widgets
│   ├── OtherContentBlocker/              # Content blocker: other annoyances
│   ├── CustomContentBlocker/             # Content blocker: user custom rules
│   ├── SharedSources/                    # Code shared across all targets
│   │   ├── DI/                           # Shared DI containers
│   │   ├── ContentBlockers/              # Content blocker shared logic
│   │   ├── ExtensionBrowserApi/          # Browser API abstractions
│   │   ├── FileSystem/                   # File storage protocols
│   │   └── Utils/                        # Shared utilities
│   ├── SciterResources/                  # Compiled Sciter UI resources
│   │   └── SciterSchema/                 # Generated Protobuf Swift schema
│   ├── AdguardMini Builder/              # Build-time code generation
│   ├── AdguardMini Prebuilder/           # Pre-build scripts (deps, defaults)
│   ├── AdguardMiniTests/                 # XCTest unit tests
│   ├── Scripts/                          # Shell scripts for build pipeline
│   ├── Helper/                           # Helper app target
│   ├── Watchdog/                         # Watchdog target
│   ├── sciter-ui/                        # TypeScript UI source
│   │   ├── @types/                       # Custom TypeScript type definitions
│   │   ├── modules/                      # UI modules
│   │   │   ├── common/                   # Shared components, hooks, utils, intl
│   │   │   ├── tray/                     # System tray menu UI
│   │   │   ├── settings/                 # Settings window UI
│   │   │   ├── onboarding/               # Onboarding flow UI
│   │   │   ├── userrules/                # User rules editor (runs in WebView)
│   │   │   ├── inline/                   # Inline element blocking UI
│   │   │   └── lottie/                   # Lottie animations
│   │   ├── schema/                       # Protobuf schema definitions
│   │   └── scripts/                      # Webpack configs, lint, build scripts
│   └── sciter-js-sdk/                    # Sciter JS SDK (vendored)
├── fastlane/                             # Fastlane automation (Ruby)
│   ├── Updating/                         # Dependency update automation
│   ├── Building                          # Build lanes
│   ├── Testing                           # Test lanes
│   ├── Deploying                         # Deploy lanes
│   ├── Sciter                            # Sciter UI build lanes
│   └── Sentry                            # Sentry upload lanes
├── Support/Scripts/                      # Developer utility scripts
├── bamboo-specs/                         # CI/CD pipeline definitions
├── docs/                                 # Project documentation
├── specs/                                # SDD feature specifications
├── .windsurf/workflows/                  # AI agent workflow definitions
├── configure.sh                          # Project setup script
├── package.json                          # Node.js dependencies (UI)
├── tsconfig.json                         # TypeScript configuration
├── Gemfile                               # Ruby dependencies (Fastlane)
└── DEVELOPMENT.md                        # Development setup guide
```

## Build And Test Commands

### Project Setup

- `./configure.sh dev` - Initialize development environment (installs protoc
  tools, sets up dependencies)
- `yarn` - Install frontend dependencies
- `bundle install` - Install Ruby/Fastlane dependencies

### Frontend (TypeScript/Sciter UI)

- `yarn build:dev` - Development build of Sciter UI
- `yarn build:prod` - Production build of Sciter UI
- `yarn start` - Webpack watch mode for hot-reload development
- `yarn watchProject` - Rebuild and restart app on file changes
- `yarn lint` - Run ESLint on TypeScript sources
- `yarn lint:fix` - Auto-fix ESLint issues
- `yarn build:userRules` - Build user rules module separately
- `yarn devserver` - Start webpack dev server (web build mode)

### Platform (Swift/Xcode)

- Build via Xcode: open `AdguardMini/AdguardMini.xcodeproj` and build (Sciter
  UI is built automatically as an Xcode target dependency)

### Testing

- Run XCTest suite from Xcode (target: `AdguardMiniTests`)
- `bundle exec fastlane test` - Run tests via Fastlane

### Linting

- Swift: SwiftLint (config at `AdguardMini/.swiftlint.yml`)
- TypeScript: ESLint (config at `AdguardMini/sciter-ui/scripts/lint/prod.mjs`)
- Pre-commit hook via Husky runs `lint-staged` on TypeScript files

### Localization

- `yarn locales:pull` - Pull translations from TwoSky
- `yarn locales:pushMaster` - Push base locale to TwoSky
- `yarn locales:check` - Validate locale files
- `./Support/Scripts/locales.sh push` - Push Swift base locale
- `./Support/Scripts/locales.sh` - Pull all Swift locales

### Protobuf Schema

- `bundle exec fastlane update_proto_schema` - Regenerate Swift and TypeScript
  schema from Protobuf definitions

### Dependency Updates

- `bundle exec fastlane update_third_party_deps` - Update all dependencies
- `bundle exec fastlane update_third_party_deps packages:sparkle` - Update
  specific package
- `bundle exec fastlane update_third_party_deps dry_run:true` - Check for
  updates without applying

## Contribution Instructions

You MUST follow the following rules for EVERY task that you perform:

- PR title format: `AG-<task number>: <commit title in lowercase English>`.

- Before analyzing any TypeScript files, check custom type definitions at
  `AdguardMini/sciter-ui/@types`.

- You MUST run `yarn lint` and verify no new ESLint errors are introduced in
  changed TypeScript files.

- When making changes to the project structure, ensure the Project Structure
  section in `AGENTS.md` is updated and remains valid.

- If the prompt essentially asks you to refactor or improve existing code, check
  if you can phrase it as a code guideline. If it's possible, add it to
  the relevant Code Guidelines section in `AGENTS.md`.

- After completing the task you MUST verify that the code you've written
  follows the Code Guidelines in this file.

- SafariConverterLib and @adguard/safari-extension versions MUST always be
  exactly the same for compatibility. After updating either, verify and
  synchronize both.

## Code Guidelines

### I. Architecture

1. **Dependency Injection**: The app uses a custom DI container pattern.
   Main app services are registered in `AdguardMini/AdguardMini/DI/`, shared
   services in `AdguardMini/SharedSources/DI/`, and extensions have their own
   `DIContainer.swift` files.

   **Rationale**: Decouples components and enables testability across multiple
   targets.

2. **Multi-target structure**: Code shared between the main app and Safari
   extensions MUST be placed in `SharedSources/`. Extension-specific code stays
   in the respective extension directory.

   **Rationale**: Safari extensions run in separate processes; shared code
   avoids duplication while respecting target boundaries.

3. **Protobuf schema sync**: Swift and TypeScript communicate via Protobuf.
   Schema definitions live in `AdguardMini/sciter-ui/schema/`. Generated Swift
   code goes to `AdguardMini/SciterResources/SciterSchema/Sources/`, generated
   TypeScript stays in the schema directory.

   **Rationale**: Ensures type-safe communication between Swift platform layer
   and TypeScript UI layer.

4. **Sciter UI modules**: Each UI module (`tray`, `settings`, `onboarding`,
   `userrules`, `inline`) runs independently in its own Sciter window. Shared
   code lives in `modules/common/`. The `userrules` module runs in a WebView,
   not Sciter.

   **Rationale**: Module isolation prevents coupling and allows independent
   loading.

### II. Code Quality Standards

1. **SwiftLint compliance**: All Swift code MUST pass SwiftLint with the
   configuration at `AdguardMini/.swiftlint.yml`. Key rules:
   - Line length: 120 characters (warning)
   - File length: 400 lines (warning), 800 lines (error)
   - Function body length: 70 lines
   - `force_try` is an error
   - TODOs MUST include a JIRA reference (e.g., `// TODO: AG-1234`)
   - Use `CGRect`/`CGSize`/`CGPoint` instead of `NSRect`/`NSSize`/`NSPoint`
   - SwiftUI state properties MUST be private
   - No `[DBG]` logging
   - Use SPDX license headers, not legacy `Created by` / `Copyright` headers

   **Rationale**: Enforces consistent code style and prevents common issues.

2. **ESLint compliance**: All TypeScript code MUST pass ESLint with the
   configuration at `AdguardMini/sciter-ui/scripts/lint/prod.mjs`.

   **Rationale**: Ensures consistent TypeScript code style.

3. **SPDX license headers**: New files MUST use SPDX format:
   ```swift
   // SPDX-FileCopyrightText: AdGuard Software Limited
   // SPDX-License-Identifier: GPL-3.0-or-later
   ```

   **Rationale**: Required by project licensing policy (GPL-3.0-or-later).

### III. Testing Discipline

1. **XCTest for Swift**: Unit tests are located in `AdguardMini/AdguardMiniTests/`.
   New logic SHOULD have corresponding tests.

   **Rationale**: Prevents regressions in platform code.

2. **Jest for TypeScript**: Jest is configured for TypeScript tests. Test files
   SHOULD follow the `*.test.ts` / `*.test.tsx` naming convention.

   **Rationale**: Ensures UI logic correctness.

### IV. Other

1. **Localization**: The project supports 35 languages via TwoSky. Base locale
   is English. Swift strings are in `.strings` files, TypeScript strings in
   JSON files under `modules/common/intl/locales/`.

   **Rationale**: Centralized localization management.

2. **Content Blockers**: There are 6 content blocker extensions (General,
   Privacy, Security, Social, Other, Custom). Each has the same structure.
   Rules are split across them due to Safari's per-extension rule limit.

   **Rationale**: Safari limits the number of rules per content blocker
   extension; splitting across 6 extensions maximizes total capacity.

3. **Concurrency (Swift)**: Use Swift Concurrency (async/await) with proper
   lifecycle management. Avoid uncontrolled `Task { }` without cancellation.
   Use `@MainActor` for UI-bound code. Do not mix `DispatchQueue.main` with
   `@MainActor` in the same component.

   **Rationale**: Prevents EXC_BAD_ACCESS crashes in Swift Concurrency runtime
   caused by unmanaged task lifecycles and mixed concurrency patterns.
