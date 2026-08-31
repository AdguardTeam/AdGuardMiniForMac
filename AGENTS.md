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
    - [Frontend (TypeScript)](#frontend-typescript)
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
via WKWebView). The app uses Safari Content Blocker and Web Extension APIs
to block ads, trackers, and annoyances. It also includes a Safari popup
extension for in-browser controls and a Protobuf-based schema for Swift/TS data
synchronization.

## Technical Context

- **Language/Version**: Swift 5.9+ (platform), TypeScript 5.x (UI)
- **Primary Dependencies**:
    - Swift: Sparkle (updates), XMLCoder, FilterListManager (AdGuardFLM),
      Sentry
    - TypeScript: Preact, MobX, Webpack, google-protobuf,
      @adguard/rules-editor, @adg/webview-utils-kit (internally-vendored
      fork at `AdguardMini/ui/packages/webview-utils-kit/`; Sciter-coupled
      APIs replaced with W3C/WebKit equivalents), classix, date-fns, lodash
- **Storage**: UserDefaults, file-based storage (JSON/plist), Safari Content
  Blocker rules (JSON)
- **Testing**: XCTest (Swift), node:test (TypeScript)
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
│   │   │   ├── AppDelegate.swift         # App lifecycle entry
│   │   │   ├── AppLifecycle/             # Lifecycle, reset, watchdog
│   │   │   ├── AppStore/                 # App Store / in-app purchase
│   │   │   ├── AppUpdater/               # Sparkle-based app updates
│   │   │   ├── Backend/                  # Backend API, licensing, web flows
│   │   │   ├── BrowserApi/               # Safari / XPC API providers
│   │   │   ├── Core/                     # Core services, protocols, DTOs
│   │   │   ├── CustomUrlSchemes/         # URL scheme / deep link handling
│   │   │   ├── Filters/                  # Filter management and Safari conversion
│   │   │   ├── ImportExport/             # Settings import/export
│   │   │   ├── Legacy/                   # AdGuard for Safari legacy mappers
│   │   │   ├── Licensing/                # License management
│   │   │   ├── LoginItem/                # Launch-at-login management
│   │   │   ├── Mail/                     # Mail Tracking Protection
│   │   │   ├── Migration/                # Versioned + legacy migrations
│   │   │   ├── ProtectionService.swift   # Enables/disables protection
│   │   │   ├── SafariExtensions/         # Safari extension management
│   │   │   ├── Sentry/                   # Sentry crash reporting setup
│   │   │   ├── ServiceSupervisor.swift   # Actor starting/stopping services
│   │   │   ├── Settings/                 # User settings management
│   │   │   ├── Support/                  # Support contact entry point
│   │   │   ├── Telemetry/                # Telemetry event definitions
│   │   │   ├── UI/                       # Native UI (status bar, menus, alerts)
│   │   │   ├── URLFilter/                # URL-filtering configuration
│   │   │   ├── Utils/                    # Utility extensions
│   │   │   ├── WebView/                  # WebView app glue: Services/ bridge impls + WebViewCallbackCoordinator
│   │   │   ├── WebViewAdapter/           # WKWebView hosting/adapter machinery (hosts, windows, message handlers, security)
│   │   │   └── main.swift                # Process entry point
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
│   │   ├── URLFilter/                    # URL filtering shared contracts
│   │   └── Utils/                        # Shared utilities
│   ├── MiniResources/                  # Generated Protobuf Swift schema + built WKWebView UI bundle
│   │   ├── ProtoSchema/                   # Generated Protobuf Swift schema (local SPM package)
│   │   └── WebUI/                         # Built WKWebView UI bundle injected into the app
│   ├── SciterResources/                   # Legacy Sciter resources (SciterSchema/), slated for removal
│   ├── AdguardMini Builder/              # Build-time code generation
│   ├── AdguardMini Prebuilder/           # Pre-build scripts (deps, defaults)
│   ├── SafariExtension Builder/          # Safari extension build-time scripts
│   ├── AdguardMiniTests/                 # XCTest unit tests
│   ├── Scripts/                          # Shell scripts for build pipeline
│   ├── Helper/                           # Helper app target
│   ├── Watchdog/                         # Watchdog target
│   └── ui/                               # TypeScript UI source
├── bin/                                  # Toolchain wrappers generated by configure.sh
├── Support/Scripts/                      # Developer utility scripts (locales, proto schema, deps)
│   └── webview-screenshots/              # Live WebView screenshot tool (tray/settings)
├── .github/skills/                       # Copilot skills (figma-webview-diff, …)
├── docs/                                 # Technical docs (production build & deploy)
├── support-scripts/                      # Internal developer scripts (localization, workflows)
├── sciter-adguard-mini-private-template/ # Private repo template (Sciter era)
├── configure.sh                          # Project setup script
├── package.json                          # Node.js dependencies (UI)
├── tsconfig.json                         # TypeScript configuration
├── Gemfile                               # Ruby dependencies
├── REUSE.toml                            # REUSE/SPDX licensing metadata
├── LICENSE.txt                           # Project license
├── LICENSES/                             # SPDX license texts
├── README.md                             # Project readme
└── DEVELOPMENT.md                        # Development setup guide
```

## Build And Test Commands

### Project Setup

- `./configure.sh dev` - Initialize development environment (captures toolchain,
  generates wrappers in `bin/`, installs protoc tools, sets up dependencies)
- `yarn` - Install frontend dependencies

### Frontend (TypeScript)

- `yarn build:dev` - Development build of UI
- `yarn build:prod` - Production build of UI
- `yarn start` - Webpack watch mode for hot-reload development
- `yarn syncUI` - Rebuild the UI bundle, inject it into the **existing** built
  `.app` (no Xcode rebuild) and relaunch the app
  (`AdguardMini/Scripts/syncWebUI.sh`)
- `yarn watchProject` - Watch the webpack output and hot-swap it into the
  existing built `.app` on every change (run together with `yarn start`)
- `yarn lint` - Run ESLint on TypeScript sources
- `yarn lint:fix` - Auto-fix ESLint issues
- `yarn theme:generate` - Generate theme stylesheets from design tokens

### Platform (Swift/Xcode)

- **Preferred (Xcode MCP)**: Use `BuildProject` with
  `tabIdentifier` from `XcodeListWindows`. Requires the Xcode project to be
  open.
- **Fallback (terminal)**:
  `xcodebuild -project AdguardMini/AdguardMini.xcodeproj -scheme AdguardMini
  -configuration Debug-Standalone build`
  `Debug-Standalone` is the native debug variant (backed by
  `ConfigNative.xcconfig`); the project's build configurations are
  `Debug-Standalone`, `Debug-MAS`, `Release`, and `MAS` — `Debug` alone is not
  a valid configuration name.

### Testing

- **Preferred (Xcode MCP)**: Use `RunSomeTests` / `RunAllTests` with
  `tabIdentifier` from `XcodeListWindows`. Note: the active scheme's test plan
  must include `AdguardMiniTests`; if `GetTestList` returns 0 tests, fall back
  to the terminal method.
- **Fallback (terminal)**:
  `xcodebuild test -project AdguardMini/AdguardMini.xcodeproj -scheme AdguardMini`
- **TypeScript (node:test)**: `yarn test:node` runs the TypeScript test
  suite (Node's built-in `node:test` runner — not Jest). Set `RUN_BUILD=1`
  (`RUN_BUILD=1 yarn test:node`) to also run the slow integration tests that
  shell out to webpack + `generateUI.sh`; these self-skip by default so
  lint-staged pre-commit stays fast. No CI lane sets `RUN_BUILD=1`
  automatically; the slow suite is developer-invoked.
- **CI**: `yarn lint --quiet` and `yarn test:node` also run on every pull
  request via the `ts-lint` and `ts-test` jobs in
  `.github/workflows/pr-check.yml` (Linux `team-sciter` pool, Node per
  `.nvmrc`), so TypeScript regressions fail PR checks like the Swift lanes do.

### Linting

- Swift: `swiftlint lint --config .swiftlint.yml --working-directory AdguardMini`
  (config: `AdguardMini/.swiftlint.yml`)
- TypeScript: `yarn lint`
  (config: `AdguardMini/ui/scripts/lint/prod.mjs`)
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
- `AdguardMini/ui/packages/proto-generator` - Vendored (local) fork of the
  `@adg/proto-generator` codegen, trimmed to the Swift and TypeScript
  converters (the C# converter/templates were removed — this project only
  generates Swift + TypeScript). It is symlinked into `node_modules`
  (`node_modules/@adg/proto-generator`), which is how
  `AdguardMini/Scripts/updateProtoSchema.sh` resolves it.

### Dependency Updates

- `bin/ruby Support/Scripts/update_third_party_deps.rb` - Update all
  third-party dependencies
- `bin/ruby Support/Scripts/update_third_party_deps.rb`
  `--packages=assistant,safariconverterlib` - Update specific packages
- `bin/ruby Support/Scripts/update_third_party_deps.rb --dry-run` - Check
  for updates without applying

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

### WebView Screenshot Tool

- Live-capture screenshots of the **running** app's WKWebView modules (tray
  popover and settings window) without a dev server. Attaches to the live app
  (usually the DEBUG build launched from Xcode).
- Location: `Support/Scripts/webview-screenshots/` (`webview_screenshot.py` +
  `webview-screenshot` wrapper + `README.md`).
- Requirements: macOS, Python 3 (standard library only), and the **Screen
  Recording** + **Accessibility** privacy permissions granted.
- Commands (run from anywhere; the wrapper resolves the script path):
  - `./Support/Scripts/webview-screenshots/webview-screenshot list` — list
    AdGuard Mini CoreGraphics windows with their ids, titles, and geometry.
  - `./Support/Scripts/webview-screenshots/webview-screenshot capture tray [out.png]` —
    capture the tray popover (defaults to `.screenShotsReview/tray.png`).
  - `./Support/Scripts/webview-screenshots/webview-screenshot capture settings [out.png]` —
    capture the settings window (defaults to `.screenShotsReview/settings.png`).
  - `./Support/Scripts/webview-screenshots/webview-screenshot open tray|settings` —
    open a module via native UI (status-item click for tray, `Cmd+,` for
    settings). Best-effort.
- Notes: Synthetic clicks do NOT reach the tray WebView (non-key status panel),
  so the tool only screenshots/opens modules; use the Web Inspector to drive the
  UI. Window capture is coordinate-independent (`screencapture -l <CGWindowID>`)
  and robust to multi-display / negative-Y layouts.

### Figma ↔ WebView Visual Diff Skill

- Human-in-the-loop skill that compares a **live WKWebView module screenshot**
  (tray/settings) against its **Figma design render** and fixes **layout**
  discrepancies — element placement, sizes, spacing, and colors — rather than
  chasing pixel-perfect parity.
- Location: `.github/skills/figma-webview-diff/SKILL.md` (with `references/`
  docs: a diff-prompt template and a discrepancy→source map).
- Requires: the Figma MCP (`get_screenshot`, `get_design_context`,
  `get_variable_defs`) and Visor MCP (`ui_diff_check`) servers connected, plus
  the WebView Screenshot Tool prerequisites above.
- Invoke: provide a Figma selection URL (must include `node-id`) and the module,
  e.g. `/figma-webview-diff https://www.figma.com/design/<key>/<name>?node-id=1-2 tray`.
- Loop: render the Figma reference (`get_screenshot`) → capture the live WebView
  (`webview-screenshot capture`) → `ui_diff_check` → if differences, use
  `get_design_context`/`get_variable_defs` to fix the Preact/TS source →
  `yarn build:dev` → STOP and ask the user to reopen the exact screen before
  re-capturing. Never trust a stale capture. Apply quality gates (`yarn lint`,
  SwiftLint if Swift touched) before declaring done.
- Scope: only `tray` and `settings` are targetable today; for other modules use
  `webview-screenshot list` + manual `screencapture -l <id>`.

## Contribution Instructions

You MUST follow the following rules for EVERY task that you perform:

- PR title format: `AG-<task number>: <commit title in lowercase English>`.

- Before analyzing any TypeScript files, check custom type definitions at
  `AdguardMini/ui/@types`.

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

- A finding that points to an explicit `// TODO: AG-<task>` trade-off scoped
  to the current change is an acknowledged decision: flag it in the review
  with its severity and the JIRA reference, but it MUST NOT block the merge
  on its own. Unblocked, untracked concerns and ordinary findings still
  apply as usual.

## Code Guidelines

### System Design

AdGuard Mini is a long-running macOS desktop application composed of a Swift
platform layer and a WebView/TypeScript UI. Design for a resource-rich but
long-lived environment:

- The app runs as a long-lived process — release resources (file handles, XPC
  connections, timers, `NotificationCenter` observers) proactively; do not
  rely on process exit to free them.
- Handle multiple WKWebView windows (tray, settings, onboarding) and concurrent
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
  (filters, licensing, WebView bridge, storage).
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
Native UI (status bar, menus, alerts) + WebView UI (TypeScript/Preact/MobX)
     ↓
WebView Bridge (Protobuf services + callbacks, window lifecycle)
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
   Schema definitions live in `AdguardMini/ui/schema/`. Generated Swift
   code goes to `AdguardMini/MiniResources/ProtoSchema/Sources/`, generated
   TypeScript stays in the schema directory.

   **Rationale**: Ensures type-safe communication between Swift platform layer
   and TypeScript UI layer.

4. **UI modules**: Each UI module (`tray`, `settings`, `onboarding`,
   `userrules`) runs independently in its own WKWebView window. Shared
   code lives in `modules/common/`. The `userrules` module opens as a
   Swift-owned child `NSWindow` + `WKWebView` (invoked from either the
   tray or settings modules), unlike the other three modules which open
   as top-level windows.

   The Protobuf bridge is deployed atomically: the Swift platform and the
   WebView UI ship in a single app bundle, and the schema is an in-memory
   wire only — messages are never serialized to durable storage.
   Consequently, removing or renaming fields does not require reserving
   their tag numbers and names; deleted tags may be freely reused in later
   schema revisions.

   **Exception**: if a message is ever persisted (UserDefaults, files,
   CoreData) or crosses a version boundary, mark deleted tags and names as
   `reserved` to prevent silent wire corruption.

   **Rationale**: Module isolation prevents coupling and allows independent
   loading.

5. **Observable window state over custom events**: In TypeScript UI modules,
   window-level state such as visibility or the effective theme SHOULD be
   modeled as MobX observable fields on the module's store rather than
   hand-rolled event/action classes. When a value has multiple sources (for
   example, the theme preference in the settings proto and the platform's
   `OnEffectiveThemeChanged` callback), merge them into the single observable
   in the store (`setSettings` applies explicit preferences immediately and
   resolves `system` against the platform). `observer` components and hooks
   then re-render automatically when the state changes.

   **Rationale**: MobX already drives component updates across these modules;
   custom pub/sub events duplicate that machinery and require manual
   subscribe/unsubscribe wiring. A single merged source of truth keeps
   consumers trivial (`useTheme` becomes a one-line effect on the observable).

6. **Declarative story-frame navigation**: Story frames MUST declare navigation
   and buttons as data (`nextFrameId`, `buttons`) rather than imperative
   navigation callbacks or button components. Back navigation follows the path
   the user took via a per-story history stack; when the stack is empty it
   falls back to the previous linear frame, then the story boundary. Frame
   image sizing is derived from the declared button count (0 → large,
   1 → medium, ≥2 → small), never from the presence of a `component` field.

   **Rationale**: Keeps story configuration declarative and unit-testable;
   history-based back preserves the user's actual journey across non-linear
   jumps, and button-count sizing keeps layouts correct as button counts vary.

7. **WebView adapter vs. app glue separation**: WKWebView hosting/runtime
   machinery (`WKWebViewAppHost`, window controllers, message handlers,
   navigation/security, timeout monitoring, failure presenter) MUST live in
   `Sources/WebViewAdapter/`, structurally separated from the app-domain
   WebView bridge glue that stays in `Sources/WebView/` (the `Services/`
   bridge implementations and `WebViewCallbackCoordinator`). New WebView
   machinery goes in `WebViewAdapter/`; new service bridges go in
   `WebView/Services/`. Both folders are plain (non-package) app-target
   sources today — the separation mirrors the former
   `mac.sp-sciter-sdk`/`SciterSwift` package boundary and keeps a clean
   on-ramp to promoting `WebViewAdapter/` into a local SPM package later.
   The adapter MAY use the generic AML utility `UIUtils` (window
   registration and activation policy are host-level concerns), but MUST
   stay free of app-domain services (`FLM`, app services) and app-specific
   glue.

   **Rationale**: Explicitly separates reusable adapter code from
   application-specific glue so the module boundary is visible in the
   project tree (per PR AG-57496 review), keeps the adapter free of
   app-domain services (`FLM`, app services) — with the sole generic-utility
   exception of AML `UIUtils` — and eases a future package extraction.

**Known exclusions** (acceptable today, to be improved over time):

- `ServiceLocator` is a large Service Locator / God Object that lazily builds
  and injects ~30 services, hiding the real dependency graph
  (`AdguardMini/AdguardMini/DI/ServiceLocator/ServiceLocator.swift`).
- `WebView/Services/` `*ServiceImpl` bridge classes (e.g.,
  `SettingsServiceImpl`) conform to many `*Dependent` protocols and hold
  business logic, violating Interface Segregation and mixing the bridge and
  service layers.
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
   - The `excluded` list in `AdguardMini/.swiftlint.yml` MUST stay in sync
     with the project layout. It currently covers the generated Protobuf
     schema and built WebView bundle (`MiniResources/**`, `**/*.pb.swift`),
     the UI package sources (`ui/packages/**`), Xcode and SPM build products
     (`build/**`, `**/.build`), vendored dependencies (`.bundle/**`), and
     Xcode file templates (`Support/XcodeTemplates/**`). When the layout
     changes — renamed or moved build output directories, new vendored
     dependencies, a new generated-sources location — update the exclusions
     in the same change.

   **Rationale**: Enforces consistent code style and prevents common issues.

2. **ESLint compliance**: All TypeScript code MUST pass ESLint with the
   configuration at `AdguardMini/ui/scripts/lint/prod.mjs`.

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

5. **Issue references in comments**: Comments MUST NOT carry a JIRA issue
   number, with exactly one exception: a `TODO`, where it is required (see
   the `todo_jira` SwiftLint rule above). Describe what the code does and
   why; the ticket that prompted the change belongs in the commit message
   and the pull request.
   ```swift
   // Good: the reason stands on its own.
   // `orderOut` alone frees nothing — AppKit still owns an ordered-out
   // Window — so teardown closes it instead.

   // Bad: a ticket number readers cannot act on.
   // Close the window on teardown (AG-12345).

   // The one place a ticket belongs:
   // TODO: AG-1234 Validate the icon rect instead of sleeping.
   ```

   **Rationale**: A ticket number in a comment ages badly — it points at a
   tracker many readers cannot open, goes stale when the issue is closed or
   migrated, and records the history of a change rather than the behavior of
   the code. `git blame` already ties every line to its commit and ticket, so
   the reference is not lost. A `TODO` is different: it is a promise about
   work not yet done, so it needs somewhere to track that work.

6. **Explicit `self` in Swift**: Inside a class, every reference to an
   instance method or stored property MUST be written with `self.` — not
   only in escaping closures, where the compiler already demands it.
   ```swift
   // Good: the receiver is visible on every line.
   private func armIdleTimer() {
       guard self.idleBlocker() == nil else {
           self.cancelIdleTimer()
           return
       }
       self.idleTask?.cancel()
   }

   // Bad: `idleTask` could be a property, a local, or a captured variable.
   private func armIdleTimer() {
       guard idleBlocker() == nil else {
           cancelIdleTimer()
           return
       }
       idleTask?.cancel()
   }
   ```

   **Rationale**: An unqualified name says nothing about what it refers to —
   instance state, a local, a shadowed parameter, a free function — so a
   reader must hold the enclosing scope in their head to know what a line
   touches, and a new local that shadows a property reads as correct. It also
   matches escaping closures, where `self.` is mandatory anyway, so code does
   not change shape when it moves into one. SwiftLint can enforce this with
   the `explicit_self` analyzer rule (`swiftlint analyze`), which is
   correctable and currently not enabled.

7. **Card-based UI composition**: In TypeScript UI modules, card collections
  (for example, health/status cards) SHOULD be split so each card is a
  separate component file in the local `components/` folder. Card-specific
  text, actions, and visual configuration SHOULD live inside that card
  component.

  **Rationale**: Keeps orchestration components small and makes card behavior
  easier to maintain, test, and reuse.

8. **Specification and design fidelity**: When writing feature specifications
  or implementation plans, every requirement, UI element, and design detail
  MUST trace back to an authoritative source: JIRA description, Figma design,
  explicit user confirmation, or a documented assumption. Never invent UX
  details (counts, icons, button text, spacing, layout elements) that are not
  present in the source materials.

  - Design details (icons, button text, spacing, colors) MUST come from Figma.
    If Figma tools are unavailable, use the REST API or flag the gap.
  - When adding something not explicitly in the sources, mark it as
    `[ASSUMPTION]` and seek confirmation before implementing.
  - Example anti-pattern: JIRA says "a Show hidden card appears" → do NOT add
    "showing N hidden stories" unless Figma or JIRA explicitly includes it.

  **Rationale**: Prevents fabricated requirements from entering the codebase
  and ensures the implementation matches the designer's intent.

7. **Doc comments describe the documented type only**: Doc comments MUST
  describe the purpose and behavior of the documented type itself. They
  MUST NOT reveal the internal implementation of other modules — how a
  consumer works, why a consumer exists, or build/test wiring (test target
  membership, Sciter dependencies, "extracted so it can be unit-tested").
  References to other types are allowed only where they are part of the
  documented type's own contract: its data flow (who writes/reads it),
  platform or threading constraints it must respect, or a brief pointer to
  an adjacent type. Testability, consumer wiring, and linker details belong
  in the consumer's own documentation.

  **Rationale**: Keeps documentation stable when consumers change and
  prevents internal wiring and test-infrastructure details from leaking
  into type contracts, while preserving contract-level cross-references.

8. **Fatal errors**: `fatalError` is reserved for failures of a fundamental
   mechanism the process depends on: a missing App Group container or shared
   storage, a failed Sciter or filter engine initialization. Such a failure
   puts the process in a severely broken state (broken provisioning, missing
   resources) that cannot be recovered at runtime, and degrading would only
   mask it — the same mechanism serves other data, including critical data.
   Ordinary per-operation failures (network, decode, missing file) MUST NOT
   crash: handle them with optionals, errors, and fallbacks.

   Availability of a shared container or storage is a binary, process-wide
   property: if it is missing, every consumer of it is broken, so a failable
   or caller-supplied initializer for a single consumer neither keeps the
   process functional nor prevents a crash — the same precondition already
   fails the other initializers built on that mechanism. Do not soften an
   initializer based on what data it carries today (for example "UI-only"
   metadata): the criterion is the mechanism, not the data, because the same
   mechanism may later carry critical data.

   **Rationale**: Matches the established convention and keeps crashes loud
   and meaningful for genuinely fatal conditions only.

9. **Enforced data contracts**: Values crossing a boundary (wire format,
   shared storage, an endpoint payload) are governed by a contract with the
   producer. Required fields are enforced loudly: the consumer fails and
   logs when they are missing or invalid, and does not silently degrade
   around a contract violation — the same mechanism may carry other,
   critical data. The producer and the consumer validate under one
   contract: the writer MUST NOT persist values the reader would reject.
   Optionality is a deliberate contract decision (absent is a valid state),
   never a fallback that masks a broken producer.

   **Rationale**: Keeps backend and versioning contract violations visible
   instead of papering over them.

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

3. **node:test for TypeScript**: TypeScript tests use Node's built-in
   `node:test` runner (NOT Jest — see "Build And Test Commands" section).
   Test files SHOULD follow the `*.test.ts` / `*.test.tsx` naming convention.

   **Rationale**: Ensures UI logic correctness and uses the same runtime as
   the production `node` toolchain captured by `configure.sh`.

4. **Lint-staged test triggers**: When adding new TypeScript tests, the
   `.lintstagedrc.js` file MUST be updated to include glob patterns for the
   tested source files and the test files themselves, mapping them to
   `yarn test:node`. This ensures tests run automatically on pre-commit when
   relevant files are changed.

   **Rationale**: Prevents regressions from slipping through code review by
   catching failures at commit time.

4. **Environment-independent tests**: Tests MUST NOT depend on, or be affected
   by, the developer's local environment — files on disk (`devConfig.json`),
   network availability, system state (UID, macOS version), or ambient
   settings. Make the code under test read an injected value or a pure
   compiled-in default instead of ambient state. Only in exceptional cases
   where ambient state is the very contract under test (for example a
   platform-availability check) may a test consult it, and then it MUST be
   explicit about it.

   **Rationale**: Keeps the suite green and deterministic on every machine and
   in CI, regardless of what a developer happens to have configured locally.

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
   build settings are provided by CI and xcodebuild build arguments.

2. **Version and build number** come from external sources (CI / xcodebuild
   arguments), never hardcoded — see the External version management guideline
   in Other.

3. **No hardcoded secrets** — API keys, certificates, and credentials MUST NOT
   be committed. Use the keychain and CI-provided environment variables.

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

   Mutable state shared between delegate callbacks and background tasks MUST
   be guarded by a single synchronization primitive such as `UnfairLock`;
   hopping
   through `MainActor.run` does not isolate callbacks that arrive from other
   queues. When a framework reads a value synchronously right after a
   delegate callback returns (e.g. Sparkle reads `feedURLString(for:)`
   immediately after `mayPerform`), the value MUST be resolved in advance so
   the callback returns it without blocking the main thread: probe in the
   background (at startup and before each check), cache the resolved value
   under the lock, and return the cached value from the callback. Only if a
   value cannot be resolved in advance may the callback wait, and then with
   a short bounded timeout.

   **Rationale**: Prevents EXC_BAD_ACCESS crashes in Swift Concurrency runtime
   caused by unmanaged task lifecycles and mixed concurrency patterns.

4. **Toolchain wrappers**: All Ruby and Node.js tools MUST be invoked via `bin/`
   wrappers (e.g., `bin/yarn`, `bin/ruby`, `bin/node`). Never hardcode tool
   paths (e.g., `/opt/homebrew/opt/ruby/bin/ruby`) or use `bundle exec` in
   scripts. The `configure.sh` script captures the toolchain and generates
   wrappers that ensure consistent tool versions across all environments
   (Xcode Build Phases, Terminal, CI).

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

8. **First-run auto-termination guard**: When `applicationShouldTerminateAfterLastWindowClosed`
   is used to quit the app when the first-run onboarding window closes, it MUST
   also verify that the onboarding host has actually been created (e.g.
   `webViewAppsController.host(for: .onboarding) != nil`). AppKit consults this
   method whenever the app's last window closes — including transient startup
   windows such as the `checkAppLocation()` alert, which closes before the
   onboarding host exists. Without the guard the app terminates during startup,
   before `startAppStep0` runs, so the onboarding window never appears.

   **Rationale**: Prevents AppKit's terminate-after-last-window-closed check from
   killing the app while it still has no windows at startup (first run).

9. **External version management**: Version and build number MUST come from
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

10. **Onboarding tray suppression**: The tray (status-bar icon) MUST NOT appear
    while onboarding is in progress (`firstRun == true`). Tray icon visibility
    is derived from `firstRun` in `StatusBarItemControllerImpl` (`updateStatusBarIcon`
    and `updateTrayIconVisibilityBySetting`), so every code path that touches the
    icon — launch, protection-status changes — keeps it hidden during onboarding.
    Making it visible happens only after onboarding completes
    (`OnboardingServiceImpl.onboardingDidComplete`) or when first run skips
    onboarding via a successful legacy migration (`startAppStep2`), both of which
    refresh the icon after clearing `firstRun`.

    **Rationale**: The tray must not be reachable before onboarding finishes;
    deriving visibility from `firstRun` in one place keeps all code paths
    consistent and prevents the icon from reappearing mid-onboarding.

11. **Logging subsystem (Swift)**: `os.Logger` writes to the unified OS log
    only — it never flows through AML's `Logger.shared` handlers (the app's
    log file, OSLog, and last-error store), which is what the app's exported
    diagnostics are built from. To reach the app's logs, route through the
    project-wide `LogDebug`/`LogInfo`/`LogWarn`/`LogError` helpers (AML
    `Logger.shared`). App-target code that uses plain `os.Logger` (e.g.
    `WKWebViewAppHost`) MUST pass `Subsystem.mainApp.name` (equal to
    `BuildConfig.AG_APP_ID`) as the subsystem — not a hardcoded string — so
    it stays reachable in the unified log. `JsLogMessageHandler` routes JS
    `window.log` posts through AML `Logger.shared` (never plain `os.Logger`),
    so TS diagnostics land in the app log file, OSLog stream and last-error
    store alongside Swift lines. Code compiled into a separate
    module that cannot reference `Subsystem`/`BuildConfig`/AML (the
    `ProtoSchema` package) MUST not log on its own: it MUST route bridge
    diagnostics through the `BridgeLog` static sink instead. The app installs
    `BridgeLog.sink` once in `AppLogConfig.setup()` forwarding into
    `LogDebug`/`LogInfo`/`LogWarn`/`LogError`; with no sink configured
    (tests, build tools) the calls are no-ops.

    **Rationale**: Deriving a subsystem alone does not make an `os.Logger`
    call reach the app's log file or last-error store — only AML
    `Logger.shared` handlers do. `BridgeLog.sink` is the configured-callback
    seam that funnels ProtoSchema's codegen-emitted bridge log lines (which
    physically live in the package and cannot call `LogError`) back into the
    app's single logging pipeline.

12. **Renderer-supplied path confinement (Swift)**: Every path-bearing RPC
    that reads or writes the filesystem MUST confine the renderer-supplied
    path via `PathConfiner.isConfinable` against `PathGrantStore.shared` and
    `PathConfiner.containerRoots(appGroupIdentifier: BuildConfig.AG_APP_ID)`
    before touching the filesystem (see `UserRulesServiceImpl`,
    `FiltersServiceImpl.checkCustomFilter`, `InternalServiceImpl.showInFinder`,
    and the `SettingsServiceImpl` export/import/logs methods). Resolve `..`
    and symlinks (`standardizedFileURL.resolvingSymlinksInPath()`) before the
    check, and reject with an error + log when the path is not confinable.
    This matters even though the release sandbox rejects arbitrary paths,
    because DEBUG builds bypass the sandbox via the
    `temporary-exception.files.absolute-path.read-write` entitlement.

    **Rationale**: A compromised WebView page could otherwise read or overwrite
    arbitrary files in DEBUG builds; picker-granted and container-root paths
    are the only legitimate destinations, so the check is applied uniformly
    across every path-bearing service method.

13. **Non-fatal WebView diagnostics (Swift)**: Diagnostics that do not
    represent a WebView load failure MUST NOT surface the native
    `AppAlert.webViewLoadFailureRequest` alert. The `jsRuntimeError` channel
    carries a `kind` classifier: posts tagged `csp-violation` (blocked inline
    styles, e.g. from third-party animation libraries on macOS 12) are routed
    to `WKWebViewFailurePresenter.handleCSPViolation`, which logs and records
    telemetry but presents no modal alert (mirroring the telemetry-only
    `handleRecurringRpcTimeout` surface). New non-fatal diagnostic classes
    MUST follow the same pattern: log + telemetry, never the fatal alert.

    **Rationale**: A CSP violation is not a load failure; presenting the
    "Report issue / Restart" dialog for one interrupts onboarding and
    misleads users. Relaxing the strict module CSPs (which forbid
    `'unsafe-inline'` per the PRD "Web Content Policy") is not an acceptable
    alternative because third-party animation libraries legitimately apply
    inline styles.
