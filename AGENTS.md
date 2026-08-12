<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# AGENTS

## Table of Contents

- [Project Overview](#project-overview)
- [Technical Context](#technical-context)
- [Project Structure](#project-structure)
- [Build And Test Commands](#build-and-test-commands)
    - [Project Setup](#project-setup)
    - [Frontend (TypeScript/Sciter UI)](#frontend-typescriptsciter-ui)
    - [Platform (Swift/Xcode)](#platform-swiftxcode)
    - [Testing](#testing)
    - [Linting](#linting)
    - [Localization](#localization)
    - [Protobuf Schema](#protobuf-schema)
    - [Dependency Updates](#dependency-updates)
    - [Production Build And Deploy](#production-build-and-deploy)
- [Contribution Instructions](#contribution-instructions)
- [Code Guidelines](#code-guidelines)
    - [System Design](#system-design)
    - [Architecture](#architecture)
    - [Code Quality](#code-quality)
    - [Testing Discipline](#testing-discipline)
    - [Dependency Management](#dependency-management)
    - [Configuration & Documentation](#configuration--documentation)
    - [Markdown Formatting](#markdown-formatting)
    - [Other](#other)

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
      @adguard/rules-editor, @adg/sciter-utils-kit, classix, date-fns,
      lodash
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
│   │   │   ├── main.swift                # Process entry point
│   │   │   ├── AppDelegate.swift         # App lifecycle entry
│   │   │   ├── ProtectionService.swift   # Enables/disables protection
│   │   │   ├── ServiceSupervisor.swift   # Actor starting/stopping services
│   │   │   ├── Backend/                  # Backend API, licensing, web flows
│   │   │   ├── Core/                     # Core services, protocols, DTOs
│   │   │   ├── Filters/                  # Filter management, Safari conversion
│   │   │   ├── Sciter/                   # Sciter bridge (windows, services)
│   │   │   ├── BrowserApi/               # Safari / XPC API providers
│   │   │   ├── SafariExtensions/         # Safari extension management
│   │   │   ├── URLFilter/                # URL-filtering configuration
│   │   │   ├── Settings/                 # User settings management
│   │   │   ├── Licensing/                # License management
│   │   │   ├── AppStore/                 # App Store / in-app purchase (MAS)
│   │   │   ├── AppUpdater/               # Sparkle-based app updates
│   │   │   ├── AppLifecycle/             # Lifecycle, reset, watchdog
│   │   │   ├── Migration/                # Versioned + legacy migrations
│   │   │   ├── Legacy/                   # AdGuard for Safari legacy mappers
│   │   │   ├── ImportExport/             # Settings import/export
│   │   │   ├── CustomUrlSchemes/         # URL scheme / deep link handling
│   │   │   ├── Telemetry/                # Telemetry event definitions
│   │   │   ├── LoginItem/                # Launch-at-login management
│   │   │   ├── Mail/                     # Mail Tracking Protection
│   │   │   ├── Sentry/                   # Sentry crash reporting setup
│   │   │   ├── Support/                  # Support contact entry point
│   │   │   ├── UI/                       # Native UI (status bar, menus, alerts)
│   │   │   └── Utils/                    # Utility extensions
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
│   ├── MailBlocker/                      # MailKit content blocker (Mail.app)
│   ├── URLFilterExtension/               # Safari URL-filtering web extension
│   ├── SharedSources/                    # Code shared across all targets
│   │   ├── DI/                           # Shared DI containers
│   │   ├── ContentBlockers/              # Content blocker shared logic
│   │   ├── CustomUrlSchemes/             # Shared URL scheme definitions
│   │   ├── ExtensionBrowserApi/          # Browser API abstractions
│   │   ├── FileSystem/                   # File storage protocols
│   │   ├── ProductInfo/                  # App metadata and version info
│   │   ├── Statistics/                   # CoreData blocking statistics
│   │   ├── Storages/                     # Shared keychain / storage
│   │   └── Utils/                        # Shared utilities
│   ├── SciterResources/                  # Compiled Sciter UI resources
│   │   └── SciterSchema/                 # Generated Protobuf Swift schema
│   ├── AdguardMini Builder/              # Build-time code generation
│   ├── AdguardMini Prebuilder/           # Pre-build scripts (deps, defaults)
│   ├── SafariExtension Builder/          # Safari extension build-time scripts
│   ├── AdguardMiniTests/                 # XCTest unit tests
│   ├── Scripts/                          # Shell scripts for build pipeline
│   ├── Helper/                           # Helper app target
│   ├── Watchdog/                         # Watchdog target
│   ├── sciter-ui/                        # TypeScript UI source
│   │   ├── @types/                       # Custom TypeScript type definitions
│   │   ├── modules/                      # UI modules
│   │   │   ├── common/                   # Shared components, hooks, utils, intl
│   │   │   │   └── lib/number/            # Localized number formatting library
│   │   │   ├── tray/                     # System tray menu UI
│   │   │   ├── settings/                 # Settings window UI
│   │   │   ├── onboarding/               # Onboarding flow UI
│   │   │   ├── userrules/                # User rules editor (runs in WebView)
│   │   │   ├── webview/                  # WebView integration module
│   │   │   ├── inline/                   # Inline element blocking UI
│   │   │   └── lottie/                   # Lottie animations
│   │   ├── schema/                       # Protobuf schema definitions
│   │   ├── tests/                        # Shared TypeScript node:test suites
│   │   └── scripts/                      # Webpack configs, lint, build scripts
│   └── sciter-js-sdk/                    # Sciter JS SDK (vendored)
├── fastlane/                             # Fastlane automation (Ruby)
│   ├── Updating/                         # Dependency update automation
│   ├── Sciter                            # Sciter UI build lanes
│   ├── Config.rb                         # Build configuration constants
│   ├── Fastfile                          # Main lane definitions
│   ├── Matchfile                         # Certificate match configuration
│   ├── Pluginfile                        # Fastlane plugin dependencies
│   └── .env.default                      # Default environment settings
├── Support/Scripts/                      # Developer utility scripts
├── bamboo-specs/                         # CI/CD pipeline definitions
├── .windsurf/workflows/                  # AI agent workflow definitions
├── configure.sh                          # Project setup script
├── package.json                          # Node.js dependencies (UI)
├── tsconfig.json                         # TypeScript configuration
├── Gemfile                               # Ruby dependencies (Fastlane)
├── REUSE.toml                            # REUSE/SPDX licensing metadata
├── README.md                             # Project readme
└── DEVELOPMENT.md                        # Development setup guide
```

## Build And Test Commands

### Project Setup

- `./configure.sh dev` - Initialize development environment (captures toolchain,
  generates wrappers in `bin/`, installs protoc tools, sets up dependencies)
- `yarn` - Install frontend dependencies

### Frontend (TypeScript/Sciter UI)

- `yarn build:dev` - Development build of Sciter UI
- `yarn build:prod` - Production build of Sciter UI
- `yarn start` - Webpack watch mode for hot-reload development
- `yarn watchProject` - Rebuild and restart app on file changes
- `yarn lint` - Run ESLint on TypeScript sources
- `yarn lint:fix` - Auto-fix ESLint issues
- `yarn build:userRules` - Build user rules module separately
- `yarn theme:generate` - Generate theme stylesheets from design tokens
- `yarn devserver` - Start webpack dev server (web build mode)

### Platform (Swift/Xcode)

- **Preferred (Xcode MCP)**: Use `BuildProject` with
  `tabIdentifier` from `XcodeListWindows`. Requires the Xcode project to be
  open.
- **Fallback (terminal)**: `bin/fastlane build` or
  `xcodebuild -project AdguardMini/AdguardMini.xcodeproj -scheme AdguardMini build`
- Sciter UI is built automatically as an Xcode target dependency.

### Testing

- **Preferred (Xcode MCP)**: Use `RunSomeTests` / `RunAllTests` with
  `tabIdentifier` from `XcodeListWindows`. Note: the active scheme's test plan
  must include `AdguardMiniTests`; if `GetTestList` returns 0 tests, fall back
  to the terminal method.
- **Fallback (terminal)**: `bin/fastlane test`

### Linting

- Swift: `swiftlint lint --config .swiftlint.yml --working-directory AdguardMini`
  (config: `AdguardMini/.swiftlint.yml`)
- TypeScript: `yarn lint`
  (config: `AdguardMini/sciter-ui/scripts/lint/prod.mjs`)
- Pre-commit hook via Husky runs `lint-staged` on TypeScript files

### Localization

- `yarn locales:pull` - Pull translations from TwoSky
- `yarn locales:pushMaster` - Push base locale to TwoSky
- `yarn locales:check` - Validate locale files
- `./Support/Scripts/locales.sh push` - Push Swift base locale
- `./Support/Scripts/locales.sh` - Pull all Swift locales

### Protobuf Schema

- `./Support/Scripts/update_proto_schema.sh` - Regenerate Swift and TypeScript
  schema from Protobuf definitions

### Dependency Updates

- `bundle exec ruby Support/Scripts/update_third_party_deps.rb` - Update all
  third-party dependencies
- `bundle exec ruby Support/Scripts/update_third_party_deps.rb`
  `--packages=assistant,safariconverterlib` - Update specific packages
- `bundle exec ruby Support/Scripts/update_third_party_deps.rb --dry-run` -
  Check for updates without applying

### Production Build And Deploy

Production builds and deployment run entirely in GitHub Actions
(`.github/workflows/`). The entry point is the `Tag & Deploy` workflow
launched with a semver tag (e.g. `v2.5.0`, `v2.6.0-beta.1`); the
prerelease suffix selects the release channel: no suffix = `release`,
`-beta.N` / `-rc.N` = `beta`, `-nightly.N` = `nightly`. Every release
builds the standalone (Developer ID + notarization) and MAS (App Store)
variants and publishes them to the static storage and
TestFlight respectively. For the full pipeline map, variant table, and
release checklist, see `docs/production-build-and-deploy.md`.

## Contribution Instructions

You MUST follow the following rules for EVERY task that you perform:

- PR title format: `AG-<task number>: <commit title in lowercase English>`.

- Before analyzing any TypeScript files, check custom type definitions at
  `AdguardMini/sciter-ui/@types`.

- You MUST run `yarn lint` and verify no new ESLint errors are introduced in
  changed TypeScript files.

- You MUST run `swiftlint lint --config .swiftlint.yml --working-directory AdguardMini`
  and verify no new SwiftLint warnings or errors are introduced in changed
  Swift files.

- You MUST build the project (see "Platform" section) and verify it compiles
  without new errors after making Swift changes.

- You MUST run tests (see "Testing" section) and verify no test failures
  after making Swift changes.

- You MUST update the unit tests for any code you change so they cover the new
  behavior, and verify the whole suite still passes.

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

### System Design

AdGuard Mini is a long-running macOS desktop application composed of a Swift
platform layer and a Sciter/TypeScript UI. Design for a resource-rich but
long-lived environment:

- The app runs as a long-lived process — release resources (file handles, XPC
  connections, timers, `NotificationCenter` observers) proactively; do not
  rely on process exit to free them.
- Handle multiple Sciter windows (tray, settings, onboarding) and concurrent
  user actions safely; use Swift Concurrency and `@MainActor` rather than raw
  shared-state mutation (see the Concurrency guideline in Other).
- Persist user preferences and window geometry across restarts via
  `UserDefaults` and the shared App Group storage, and restore them on launch.
- Perform heavy work (filter conversion, downloads, FLM operations) off the
  main thread; keep the UI responsive.
- Support graceful shutdown — cancel in-progress tasks and stop services
  through `ServiceSupervisor` before the app exits.
- Handle crashes gracefully — report through Sentry and never corrupt the
  shared App Group data that Safari extensions depend on.
- Safari extensions run in separate sandboxed processes and MUST keep working
  when the main app is absent (see the Extension independence guideline in
  Other).

### Architecture

The codebase should follow these universal design principles:

- **Separation of Concerns** — each module owns one aspect of the system
  (filters, licensing, Sciter bridge, storage).
- **Single Responsibility Principle** — every file, class, or function has one
  reason to change.
- **Dependency Direction** — dependencies point downward: UI → services →
  domain / core; lower layers never import higher ones.
- **Explicit Boundaries** — cross-target code goes through `SharedSources/`
  and Protobuf interfaces; do not reach into another module's internals.
- **Data Flow Clarity** — user actions flow TS → Protobuf → Swift service →
  storage, and results flow back via registered callbacks.
- **Minimize Coupling, Maximize Cohesion** — services interact through narrow
  `*Dependent` protocols rather than concrete types.
- **Make Invalid States Impossible** — model state with Swift enums/optionals
  and Protobuf types so illegal combinations fail at compile time.
- **Observability Built-in** — logging (`Subsystem`) and Sentry reporting are
  first-class, not afterthoughts.
- **Keep It Boring** — prefer the established DI + service-supervisor pattern
  over novel abstractions.

The easiest way to achieve these principles is **layered architecture**.
This project's layers, from top to bottom:

```text
Native UI (status bar, menus, alerts) + Sciter UI (TypeScript/Preact/MobX)
     ↓
Sciter Bridge (Protobuf services + callbacks, window lifecycle)
     ↓
Service Layer (ProtectionService, UserSettingsService, SafariExtensions,
               Mail, URLFilter, LoginItem, AppLifecycle, Migration, Telemetry)
     ↓
Domain + Backend (FiltersSupervisor, SafariConverter, BackendService,
                  LicenseService)
     ↓
Core (KeychainManager, AMFileManager, NetworkManager, EventBus, DTOs)
     ↓
SharedSources (storage, content-blocker handlers, file system, statistics)
```

Each layer may call the layer below it; no layer may depend on a layer above
it. For example, `SettingsServiceImpl` (bridge) calls `UserSettingsService`
(service), which persists through `SharedSettingsStorage` (shared), while
`FiltersSupervisor` (domain) drives `SafariConverter` and writes the Content
Blocker JSON consumed by the extension targets.

**Project-specific architecture conventions:**

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

**Known exclusions** (acceptable today, to be improved over time):

- `ServiceLocator` is a large Service Locator / God Object that lazily builds
  and injects ~30 services, hiding the real dependency graph
  (`AdguardMini/AdguardMini/DI/ServiceLocator/ServiceLocator.swift`).
- Sciter `*ServiceImpl` bridge classes (e.g., `SettingsServiceImpl`) conform
  to many `*Dependent` protocols and hold business logic, violating Interface
  Segregation and mixing the bridge and service layers.
- `SharedDIContainer.shared` is a global mutable singleton with fixed
  implementations, which complicates testing and isolation.
- Legacy "AdGuard for Safari" migration code lives in the main target without
  isolation (`Sources/Legacy/`, `Sources/Migration/`).

### Code Quality

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
   - `inclusive_language` is an error
   - No redundant boolean conditions (`== true`, `== false`)
   - Capitalize the first word in comments. In multi-line `//` comments,
     each continuation line is checked independently — restructure lines so
     that every `//` line begins with a capitalized word (or a code reference
     in backticks):
     ```swift
     // Good: restructure so each `//` line starts with a capital letter.
     // `SMCopyAllJobDictionaries` is the only way to query login item status.
     // It is deprecated, but there is no alternative on macOS < 13.

     // Bad: second line starts with a lowercase word.
     // `SMCopyAllJobDictionaries` is deprecated but is the only way
     // to query login item status on macOS < 13 without side effects.
     ```
   - Analyzer rules enabled: `unused_declaration`, `unused_import`,
     `capture_variable`, `typesafe_array_init`
   - Every `// swiftlint:disable` command MUST be preceded by a plain
     comment explaining why the rule is suppressed:
     ```swift
     // Labeled parameter makes the role of the closure explicit.
     // swiftlint:disable:next trailing_closure
     ```

   **Rationale**: Enforces consistent code style and prevents common issues.

2. **ESLint compliance**: All TypeScript code MUST pass ESLint with the
   configuration at `AdguardMini/sciter-ui/scripts/lint/prod.mjs`.

   **Rationale**: Ensures consistent TypeScript code style.

3. **SPDX license headers**: New files MUST use SPDX format with a blank
   comment line (`//`) between the two SPDX lines, followed by a file name
   block:
   ```swift
   // SPDX-FileCopyrightText: AdGuard Software Limited
   //
   // SPDX-License-Identifier: GPL-3.0-or-later

   //
   //  FileName.swift
   //  AdguardMini
   //
   ```

   **Rationale**: Required by project licensing policy (GPL-3.0-or-later).

4. **Top-level documentation**: All top-level code declarations (functions,
  components, classes, interfaces, types, enums, and exported constants)
  MUST include documentation comments.
  - TypeScript: JSDoc comments
  - Swift: documentation comments (`///`)
  Documentation SHOULD describe purpose, inputs, outputs, and important usage
  constraints when applicable.

  **Rationale**: Keeps code understandable during maintenance and review,
  and makes API usage clearer for all contributors.

5. **Card-based UI composition**: In TypeScript UI modules, card collections
  (for example, health/status cards) SHOULD be split so each card is a
  separate component file in the local `components/` folder. Card-specific
  text, actions, and visual configuration SHOULD live inside that card
  component.

  **Rationale**: Keeps orchestration components small and makes card behavior
  easier to maintain, test, and reuse.

6. **Specification and design fidelity**: When writing feature specifications
  or implementation plans, every requirement, UI element, and design detail
  MUST trace back to an authoritative source: JIRA description, Figma design,
  explicit user confirmation, or a documented assumption. Never invent UX
  details (counts, icons, text content, layout elements) that are not present
  in the source materials.

  - Design details (icons, button text, spacing, colors) MUST come from Figma.
    If Figma tools are unavailable, use the REST API or flag the gap.
  - When adding something not explicitly in the sources, mark it as
    `[ASSUMPTION]` and seek confirmation before implementing.
  - Example anti-pattern: JIRA says "a Show hidden card appears" → do NOT add
    "showing N hidden stories" unless Figma or JIRA explicitly includes it.

  **Rationale**: Prevents fabricated requirements from entering the codebase
  and ensures the implementation matches the designer's intent.

### Testing Discipline

1. **XCTest for Swift**: Unit tests are located in `AdguardMini/AdguardMiniTests/`.
   New logic SHOULD have corresponding tests.

   **Rationale**: Prevents regressions in platform code.

2. **No `@testable import`**: Swift test files MUST NOT use `@testable import`.
   Instead, source files under test MUST be added directly to the
   `AdguardMiniTests` target in Xcode. This means tested code must have
   `internal` or higher access level by default — do not add `public` solely
   to satisfy tests.

   **Rationale**: Avoids bypassing access control, keeps the test build honest,
   and mirrors real client usage of the code under test.

2. **Jest for TypeScript**: Jest is configured for TypeScript tests. Test files
   SHOULD follow the `*.test.ts` / `*.test.tsx` naming convention.

   **Rationale**: Ensures UI logic correctness.

3. **Lint-staged test triggers**: When adding new TypeScript tests, the
   `.lintstagedrc.js` file MUST be updated to include glob patterns for the
   tested source files and the test files themselves, mapping them to
   `yarn test:node`. This ensures tests run automatically on pre-commit when
   relevant files are changed.

   **Rationale**: Prevents regressions from slipping through code review by
   catching failures at commit time.

### Dependency Management

- **Pin dependency versions explicitly** — avoid version ranges that allow
  automatic upgrades to untested releases. For Swift Package Manager, pin to
  exact versions; for the UI, prefer exact versions in `package.json`.
- **Prefer vanilla solutions** — use the Swift standard library / Foundation
  and TypeScript built-ins before adding a dependency.
- **Reputable sources only** — dependencies MUST come from well-established,
  actively maintained projects (judge by downloads, activity, maintainers).
- **Avoid unpopular libraries** — do NOT add niche or obscure packages with
  limited adoption; they add security and maintenance risk.
- **Minimize dependency count** — every dependency increases attack surface,
  bundle size, and maintenance burden. Justify each addition.
- **Use the latest stable version** — check the package registry (npm / SPM)
  for the current stable release instead of copying old version numbers from
  memory or other projects.
- **SafariConverterLib and @adguard/safari-extension versions MUST always
  match exactly** — after updating either, verify and synchronize both.

**Rationale**: Fewer, well-vetted dependencies reduce security
vulnerabilities, supply chain risk, and long-term maintenance cost.

**Known exclusions** (to be fixed): `package.json` currently uses caret (`^`)
ranges for all runtime and dev dependencies rather than exact pins.

### Configuration & Documentation

1. **Build configuration** lives in `.xcconfig` files (`AppConfig.xcconfig`,
   `CommonConfig.xcconfig`, `ConfigMAS.xcconfig`, `ConfigNative.xcconfig`).
   `UserDefaults` defaults are generated by `AdguardMini Prebuilder`, and
   Fastlane reads settings from `fastlane/.env.default`.

2. **Version and build number** come from external sources (CI / xcodebuild
   arguments), never hardcoded — see the External version management guideline
   in Other.

3. **No hardcoded secrets** — API keys, certificates, and credentials MUST NOT
   be committed. Use Fastlane match, the keychain, and CI-provided environment
   variables.

4. **Keep docs in sync with code** — when you change build commands, the
   project layout, or the Protobuf schema, update `AGENTS.md` (and
   `DEVELOPMENT.md` / `README.md` for environment setup) in the same change.

**Rationale**: Configuration truth stays in CI and per-environment files,
keeping the repository reproducible and free of secrets.

### Markdown Formatting

All Markdown files MUST follow these formatting rules:

- **Line length**: Keep lines at most 80 characters, but don't overwrap the
  lines artificially short just to hit the limit, keep them close to 80
  characters where possible. This is not a hard lint gate, but SHOULD be
  followed for readability. Lines inside fenced code blocks are exempt from
  this limit.
- **Unordered lists**: Use dashes (`-`) for bullet points. Indent nested
  list items by 4 spaces.
- **Continuation lines**: When a list item wraps to the next line, align the
  continuation with the first character of the item text, not the list
  marker. This applies to all list types (ordered and unordered).
- **Emphasis**: Use asterisks (`*`) for emphasis (`*italic*`, `**bold**`).
  Do NOT use underscores.
- **Headings**: Duplicate heading names are allowed only among sibling
  headings (same parent level). Avoid duplicates across different levels.
- **Inline HTML**: Avoid raw HTML in Markdown. The only allowed elements are
  `<a>`, `<p>`, `<details>`, `<summary>`, and `<img>`.
- **Trailing spaces**: Do NOT leave trailing whitespace on any line. Do NOT
  use two-space line breaks — use a blank line instead.
- **Bare URLs**: Bare URLs are permitted and do not need to be wrapped in
  angle brackets.
- **Table formatting**: Align table columns with padding when the table fits
  within 80 characters. If the table exceeds 80 characters or triggers an
  MD060 linter warning, switch to a compact format using single spaces only.
  This applies to the separator row as well — it should be written as
  `| --- |`, not `|--|`.

**Rationale**: Uniform Markdown formatting improves readability for both
humans and AI agents that consume project documentation.

### Other

1. **Localization**: The project supports 35 languages via TwoSky. Base locale
   is English. Swift strings are in `.strings` files, TypeScript strings in
   JSON files under `modules/common/intl/locales/`.

   **Rationale**: Centralized localization management.

2. **Content Blockers**: There are 7 content blocker extensions. Six are
   Safari content blockers (General, Privacy, Security, Social, Other,
   Custom), each with the same structure, with rules split across them due to
   Safari's per-extension rule limit. The seventh is `MailBlocker`, a MailKit
   content blocker that serves WebKit Content Blocking JSON to Mail.app from
   the shared App Group; it is not subject to the Safari rule-splitting.

   **Rationale**: Safari limits the number of rules per content blocker
   extension; splitting across 6 Safari extensions maximizes total capacity.
   `MailBlocker` is a single MailKit extension with a separate rule source.

3. **Concurrency (Swift)**: Use Swift Concurrency (async/await) with proper
   lifecycle management. Avoid uncontrolled `Task { }` without cancellation
   for long-lived or stateful work. Short-lived bridge tasks that only
   dispatch a single call (e.g., `Task { await store.dispatch(.action) }`)
   are acceptable without explicit cancellation tracking.
   Use `@MainActor` for UI-bound code. Do not mix `DispatchQueue.main` with
   `@MainActor` in the same component.

   **Rationale**: Prevents EXC_BAD_ACCESS crashes in Swift Concurrency runtime
   caused by unmanaged task lifecycles and mixed concurrency patterns.

4. **Toolchain wrappers**: All Ruby and Node.js tools MUST be invoked via `bin/`
   wrappers (e.g., `bin/fastlane`, `bin/yarn`, `bin/ruby`, `bin/node`). Never
   hardcode tool paths (e.g., `/opt/homebrew/opt/ruby/bin/ruby`) or use
   `bundle exec` in scripts. The `configure.sh` script captures the toolchain
   and generates wrappers that ensure consistent tool versions across all
   environments (Xcode Build Phases, Fastlane, Terminal, CI).

   **Rationale**: Eliminates PATH-dependent behavior, removes reliance on shell
   init files and version managers (nvm, rbenv), and ensures reproducible builds
   regardless of developer environment.

5. **Import resolution via bundler injections**: If an import is not found or appears to be missing,
   CHECK bundler inject configurations: **webpack**: `ProvidePlugin` in `scripts/webpack/webpack.config.base.js`.
   These variables are **globally available** without explicit imports in the source code.
   When reviewing code, do not flag missing imports for these injected globals.

6. **Extension independence**: Safari extensions (content blockers, popup,
   web extension) MUST remain functional when the main app is absent or not
   running. The current codebase does not fully satisfy this goal, but you MUST
   NOT make it worse. Any new code that causes an extension to lose
   functionality (or fail entirely) solely because the main app is unavailable
   is incorrect and MUST be reworked.

7. **Constants grouping (Swift)**: Repeated literal values within a type MUST
   be extracted into a `private enum Constants` nested type. Each constant gets
   a descriptive name; the raw value appears only once.

   **Rationale**: Eliminates magic numbers, makes intent clear, and simplifies
   future changes.

8. **External version management**: Version and build number MUST come from
   external sources (CI, xcodebuild arguments), not hardcoded in
   `CommonConfig.xcconfig`. The xcconfig contains placeholder values
   (`AG_VERSION = 99.9.9`, `AG_BUILD = 999999`) that are overridden at build
   time by passing `AG_VERSION=x.y.z` and `AG_BUILD=N` as xcodebuild arguments.
   The `generateConfigConstants.sh` script reads these from environment
   variables, so `BuildConfig.swift` automatically reflects the overridden
   values.

   To build with a specific version from the command line:
   ```
   xcodebuild archive ... AG_VERSION=2.5.0 AG_BUILD=1089
   ```

   To pass version/build in CI, use the `version` and `build-number` inputs of
   `build-variant.yml`.

   **Rationale**: Keeps version truth in CI/CD (git tags, KV store) rather than
   requiring manual edits to xcconfig for every release.

#### Sciter runtime

1. **Hidden Sciter windows do not process idle.** In the Sciter engine
   (`wing::ET_WINDOW_IDLE`), windows whose state is `WINDOW_HIDDEN` skip
   `request_idle()`, so `html::view::process_posted_things` is never run while a
   window is hidden. DOM-mutating work delivered to a hidden Sciter view (for
   example a Swift→Sciter callback that updates a MobX store and triggers a
   re-render) is therefore queued and only drained on the first idle after the
   window is shown. Processing that stale work can dereference invalidated
   elements and crash inside `process_posted_things` (`EXC_BAD_ACCESS`,
   byte write at 0x0).

   - Do NOT deliver DOM-mutating callback data into a Sciter view while its
     window is hidden. Gate delivery on window visibility (for example
     `SciterApp.isAppHidden()`), invoked on the main actor.
   - When a callback is gated off because the window was hidden, the window MUST
     re-fetch the corresponding data when it becomes visible (for example in
     `OnWindowDidBecomeMain`) so the freshly shown view is not stale.

   **Rationale**: Prevents the accumulate-then-crash pattern observed when
   user-rules updates were pushed into the hidden settings window and the window
   was subsequently opened from the tray.
