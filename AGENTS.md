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
- [Contribution Instructions](#contribution-instructions)
- [Code Guidelines](#code-guidelines)
  - [System Design](#system-design)
  - [Architecture](#architecture)
  - [Code Quality](#code-quality)
  - [Testing](#testing)
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
  - Swift: Sparkle 2.8.0 (updates), XMLCoder 0.17.1,
    FilterListManager 2.3.5 (AdGuardFLM), swift-protobuf 1.31.0,
    Sciter SDK, Sentry
  - TypeScript: Preact 10.x, MobX 6.x, Webpack 5.x, google-protobuf 3.x,
    @adguard/rules-editor 1.x, @adg/sciter-utils-kit 0.7.x, classix,
    date-fns 4.x, lodash
- **Storage**: UserDefaults, file-based storage (JSON/plist), Safari Content
  Blocker rules (JSON)
- **Testing**: XCTest (Swift), node:test via `yarn test:node` (TypeScript)
- **Target Platform**: macOS 12+ (deployment), macOS 13+ (development machine),
  Safari extensions
- **Project Type**: macOS desktop app (Xcode project with multiple targets)
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
│   │   │   │   └── Services/             # Sciter API service implementations
│   │   │   ├── Licensing/                # License management
│   │   │   ├── AppStore/                 # App Store / in-app purchase
│   │   │   ├── SafariExtensions/         # Safari extension management
│   │   │   ├── ImportExport/             # Settings import/export
│   │   │   ├── CustomUrlSchemes/         # URL scheme / deep link handling
│   │   │   ├── Settings/                 # User settings management
│   │   │   ├── Telemetry/                # Telemetry event definitions
│   │   │   ├── LoginItem/                # Launch-at-login management
│   │   │   ├── UI/                       # Native UI elements (alerts, windows)
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
│   │   ├── CustomUrlSchemes/             # Shared URL scheme definitions
│   │   ├── ExtensionBrowserApi/          # Browser API abstractions
│   │   ├── FileSystem/                   # File storage protocols
│   │   ├── ProductInfo/                  # App metadata and version info
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
│   │   │   ├── common/                   # Shared components, hooks, stores, utils
│   │   │   │   ├── components/           # Shared UI components
│   │   │   │   ├── hooks/                # Shared hooks (useDateFormat, useTheme)
│   │   │   │   ├── stores/               # Shared MobX stores
│   │   │   │   ├── intl/                 # Internationalization and locales
│   │   │   │   ├── apis/                 # Protobuf request/response types
│   │   │   │   └── lib/number/           # Localized number formatting
│   │   │   ├── tray/                     # System tray menu UI
│   │   │   ├── settings/                 # Settings window UI
│   │   │   ├── onboarding/               # Onboarding flow UI
│   │   │   ├── userrules/                # User rules editor (runs in WebView)
│   │   │   ├── webview/                  # WebView integration module
│   │   │   ├── inline/                   # Inline element blocking UI
│   │   │   └── lottie/                   # Lottie animations
│   │   ├── schema/                       # Protobuf schema definitions
│   │   │   ├── services/                 # Service RPC definitions
│   │   │   └── types/                    # Shared type definitions
│   │   ├── tests/                        # Shared TypeScript node:test suites
│   │   └── scripts/                      # Webpack configs, lint, build scripts
│   └── sciter-js-sdk/                    # Sciter JS SDK (vendored)
├── fastlane/                             # Fastlane automation (Ruby)
│   ├── Updating/                         # Dependency update automation
│   ├── Building                          # Build lanes
│   ├── Testing                           # Test lanes
│   ├── Deploying                         # Deploy lanes
│   ├── Sciter                            # Sciter UI build lanes
│   ├── Sparkle                           # Sparkle update signing lanes
│   ├── Sentry                            # Sentry upload lanes
│   └── VCSWork                           # Version control operations
├── Support/Scripts/                      # Developer utility scripts
├── bamboo-specs/                         # CI/CD pipeline definitions
├── configure.sh                          # Project setup script
├── package.json                          # Node.js dependencies (UI)
├── tsconfig.json                         # TypeScript configuration
├── tsconfig.node-tests.json              # TypeScript config for node:test
├── Gemfile                               # Ruby dependencies (Fastlane)
├── REUSE.toml                            # REUSE/SPDX licensing metadata
├── README.md                             # Project readme
└── DEVELOPMENT.md                        # Development setup guide
```

## Build And Test Commands

### Project Setup

- `./configure.sh dev` — Initialize development environment (captures
  toolchain, generates wrappers in `bin/`, installs protoc tools, sets up
  dependencies).
- `yarn` — Install frontend dependencies.

### Frontend (TypeScript/Sciter UI)

- `yarn build:dev` — Development build of Sciter UI.
- `yarn build:prod` — Production build of Sciter UI.
- `yarn start` — Webpack watch mode for hot-reload development.
- `yarn watchProject` — Rebuild and restart app on file changes.
- `yarn lint` — Run ESLint on TypeScript sources.
- `yarn lint:fix` — Auto-fix ESLint issues.
- `yarn build:userRules` — Build user rules module separately.
- `yarn theme:generate` — Generate theme stylesheets from design tokens.
- `yarn devserver` — Start webpack dev server (web build mode).

### Platform (Swift/Xcode)

- **Preferred (Xcode MCP)**: Use `BuildProject` with `tabIdentifier` from
  `XcodeListWindows`. Requires the Xcode project to be open.
- **Fallback (terminal)**: `bin/fastlane build` or
  `xcodebuild -project AdguardMini/AdguardMini.xcodeproj -scheme AdguardMini build`.
- Sciter UI is built automatically as an Xcode target dependency.

### Testing

- **Swift**: Preferred via Xcode MCP (`RunSomeTests` / `RunAllTests` with
  `tabIdentifier`). If the active scheme's test plan returns 0 tests, fall
  back to terminal: `bin/fastlane test`.
- **TypeScript**: `bin/yarn test:node` — compiles tests via
  `tsc -p tsconfig.node-tests.json` and runs with Node.js native test runner.

### Linting

- **Swift**: `swiftlint lint --config .swiftlint.yml --working-directory AdguardMini`
  (config: `AdguardMini/.swiftlint.yml`).
- **TypeScript**: `yarn lint`
  (config: `AdguardMini/sciter-ui/scripts/lint/prod.mjs`).
- Pre-commit hook via Husky runs `lint-staged` on TypeScript files.

### Localization

- `yarn locales:pull` — Pull translations from TwoSky.
- `yarn locales:pushMaster` — Push base locale to TwoSky.
- `yarn locales:check` — Validate locale files.
- `./Support/Scripts/locales.sh push` — Push Swift base locale.
- `./Support/Scripts/locales.sh` — Pull all Swift locales.

### Protobuf Schema

- `bin/fastlane update_proto_schema` — Regenerate Swift and TypeScript schema
  from Protobuf definitions.

### Dependency Updates

- `bin/fastlane update_third_party_deps` — Update all dependencies.
- `bin/fastlane update_third_party_deps packages:sparkle` — Update a specific
  package.
- `bin/fastlane update_third_party_deps dry_run:true` — Check for updates
  without applying.

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

- You MUST run tests (see "Testing" section) and verify no test failures after
  making Swift changes. For TypeScript changes, run `bin/yarn test:node`.

- When making changes to the project structure, ensure the Project Structure
  section in `AGENTS.md` is updated and remains valid.

- If the prompt essentially asks you to refactor or improve existing code,
  check if you can phrase it as a code guideline. If it's possible, add it to
  the relevant Code Guidelines section in `AGENTS.md`.

- After completing the task you MUST verify that the code you've written
  follows the Code Guidelines in this file.

- SafariConverterLib and @adguard/safari-extension versions MUST always be
  exactly the same for compatibility. After updating either, verify and
  synchronize both.

## Code Guidelines

### System Design

This is a macOS desktop application with Safari extensions. The following
design rules apply:

- The main app runs as a long-lived process. Clean up resources (file handles,
  XPC connections, timers) proactively; do not rely on process exit to free
  them.
- Safari extensions run in separate OS processes. Extensions MUST remain
  functional when the main app is absent or not running. Any new code that
  causes an extension to lose functionality solely because the main app is
  unavailable is incorrect and MUST be reworked.
- Handle multiple windows (tray, settings, onboarding) and concurrent user
  actions safely. Each Sciter window runs its own MobX store hierarchy; shared
  state is synchronized through the Swift platform layer via Protobuf messages.
- Persist user preferences and window state across restarts; restore on launch.
- Perform heavy work (filter compilation, rule conversion) on background
  threads; keep the UI thread responsive with `async`/`await`.
- Support graceful shutdown — save unsaved work, cancel in-progress operations,
  and exit within a few seconds of the user's quit request.
- Handle crashes gracefully: crash logs via Sentry, restore previous state on
  next launch, do not corrupt user data.
- Use Swift Concurrency (`async`/`await`) with proper lifecycle management.
  Avoid uncontrolled `Task { }` without cancellation for long-lived or stateful
  work. Use `@MainActor` for UI-bound code. Do not mix `DispatchQueue.main`
  with `@MainActor` in the same component.

### Architecture

**Universal Design Principles**:

- **Separation of Concerns** — each module handles one aspect of the system.
- **Single Responsibility Principle** — every file, class, or function has one
  reason to change.
- **Dependency Direction** — dependencies point inward; platform layer never
  imports from UI layer.
- **Explicit Boundaries** — module interfaces are intentional; no reaching into
  internals.
- **Data Flow Clarity** — data moves through a predictable, traceable path
  (Protobuf messages over Sciter bridge).
- **Minimize Coupling, Maximize Cohesion** — modules are self-contained and
  interact through narrow, typed interfaces.
- **Make Invalid States Impossible** — use Swift enums, Protobuf `oneof`,
  TypeScript discriminated unions to prevent illegal combinations at compile
  time.
- **Keep It Boring** — prefer well-understood patterns (DI, Observer via MobX,
  Protobuf serialization) over clever or novel solutions.

**Layered Architecture**:

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| Safari Extensions | In-browser blocking and UI | PopupExtension, WebExtension, 6 Content Blockers |
| Swift Platform | Core services, Sciter bridge, licensing, filter management | `Core/`, `Filters/`, `Licensing/`, `Sciter/Services/` |
| TypeScript UI | User-facing windows rendered via Sciter | `modules/tray/`, `modules/settings/`, `modules/onboarding/` |
| Common (TS) | Shared stores, hooks, components, APIs | `modules/common/stores/`, `modules/common/hooks/`, `modules/common/apis/` |

```text
  Safari Extensions (Popup, Web Ext, Content Blockers)
           ↑ XPC / Safari API
  Swift Platform Layer (Main App + SharedSources)
           ↑ Protobuf via Sciter SDK
  TypeScript UI Layer (Tray, Settings, Onboarding)
           ↑ import
  Common Module (stores, hooks, utils, apis)
```

The Swift layer never imports from TypeScript. The TypeScript UI never directly
accesses Swift state — all cross-boundary communication goes through
`window.API.Execute(Request)` (TS→Swift) and `window.API_CALLBACK` (Swift→TS).

**Key Patterns**:

- **Dependency Injection**: Swift uses custom DI containers. Main app services
  in `AdguardMini/AdguardMini/DI/`, shared services in
  `AdguardMini/SharedSources/DI/`. TypeScript stores use **constructor DI** —
  sub-stores receive dependencies via constructor parameters, never through the
  root store.

- **Multi-target structure**: Code shared between the main app and Safari
  extensions MUST be placed in `SharedSources/`. Extension-specific code stays
  in the respective extension directory.

- **Protobuf schema sync**: Schema definitions in
  `AdguardMini/sciter-ui/schema/`. Generated Swift code in
  `AdguardMini/SciterResources/SciterSchema/Sources/`. Generated TypeScript
  stays in the schema directory alongside `.proto` files. Services and types
  are separated into `services/` and `types/` subdirectories, with shared
  types extracted to `Common.proto`.

- **Sciter UI modules**: Each UI module (`tray`, `settings`, `onboarding`,
  `userrules`, `inline`) runs independently in its own Sciter window. Shared
  code lives in `modules/common/`. The `userrules` module runs in a WebView,
  not Sciter.

- **Store architecture (TypeScript)**: Each Sciter window creates its own root
  store. Sub-stores receive dependencies via constructor, never access siblings
  through the root store. `SafariProtection` health-check properties live on
  `Filters` — there is no separate sub-store. Callback handlers call store
  action methods only; they never assign observables directly.

### Code Quality

**SwiftLint compliance**: All Swift code MUST pass SwiftLint with the
configuration at `AdguardMini/.swiftlint.yml`. Key rules:
- Line length: 120 characters (warning).
- File length: 400 lines (warning), 800 lines (error).
- Function body length: 70 lines.
- `force_try` is an error.
- TODOs MUST include a JIRA reference (e.g., `// TODO: AG-1234`).
- Use `CGRect`/`CGSize`/`CGPoint` instead of `NSRect`/`NSSize`/`NSPoint`.
- SwiftUI state properties MUST be private.
- No `[DBG]` logging.
- Use SPDX license headers, not legacy `Created by` / `Copyright` headers.
- `inclusive_language` is an error.
- No redundant boolean conditions (`== true`, `== false`).
- Capitalize the first word in comments. In multi-line `//` comments,
  restructure lines so every `//` line begins with a capitalized word or a
  code reference in backticks.
- Analyzer rules enabled: `unused_declaration`, `unused_import`,
  `capture_variable`, `typesafe_array_init`.
- Every `// swiftlint:disable` command MUST be preceded by a plain comment
  explaining why the rule is suppressed.

**Rationale**: Enforces consistent code style and prevents common issues.

**ESLint compliance**: All TypeScript code MUST pass ESLint with the
configuration at `AdguardMini/sciter-ui/scripts/lint/prod.mjs`.

**Rationale**: Ensures consistent TypeScript code style.

**SPDX license headers**: New files MUST use SPDX format with a blank comment
line (`//`) between the two SPDX lines, followed by a file name block:

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

**Top-level documentation**: All top-level code declarations (functions,
components, classes, interfaces, types, enums, exported constants) MUST
include documentation comments.
- TypeScript: JSDoc comments.
- Swift: documentation comments (`///`).

Documentation SHOULD describe purpose, inputs, outputs, and important usage
constraints when applicable.

**Rationale**: Keeps code understandable during maintenance and review.

**Constants grouping (Swift)**: Repeated literal values within a type MUST be
extracted into a `private enum Constants` nested type. Each constant gets a
descriptive name; the raw value appears only once.

**Rationale**: Eliminates magic numbers, makes intent clear, and simplifies
future changes.

**Store try/catch (TypeScript)**: Every async store action that calls
`window.API.Execute()` MUST wrap the API call in try/catch. Errors MUST be
logged with `log.error()` and state MUST be restored to a consistent state on
failure.

```typescript
public async switchFiltersState(ids: number[], isEnabled: boolean) {
    try {
        const prevState = Array.from(this.enabledFilters);
        this.updateLocalEnabledFilters(ids, isEnabled);
        const hasError = await window.API.Execute(new UpdateFiltersRequest(data));
        if (hasError.hasError) {
            runInAction(() => { this.setEnabledFilters(prevState); });
            return hasError;
        }
    } catch (err) {
        log.error('switchFiltersState failed', String(err));
    }
}
```

**Rationale**: Prevents silent crashes from unhandled promise rejections in
the Swift↔TS bridge.

**Component error UI (TypeScript)**: Components that call store actions MUST
check return values or catch errors and show appropriate notifications via the
`NotificationsQueue`.

**`runInAction` consistency (TypeScript)**: All async store methods that mutate
observable state after `await` MUST wrap mutations in
`runInAction(() => { ... })`.

**Component sizing (TypeScript)**:
- **150-line soft limit**: Components SHOULD NOT exceed 150 lines of source
  code (excluding imports, type definitions, and CSS module imports).
  Sub-components, hooks, and utility functions MUST be extracted into separate
  files when the limit is exceeded.
- **Card-based composition**: Card collections MUST use one component file per
  card in a local `components/` folder. Card-specific text, actions, and
  visual configuration live inside that card component.
- **Repeated JSX blocks**: Identical JSX blocks differing only in data MUST be
  replaced with a data-driven component rendered via `.map()`.

**Rationale**: Improves readability, testability, and makes code review more
effective.

### Testing

**XCTest for Swift**: Unit tests are located in `AdguardMini/AdguardMiniTests/`.
New logic SHOULD have corresponding tests.

**No `@testable import`**: Swift test files MUST NOT use `@testable import`.
Instead, source files under test MUST be added directly to the
`AdguardMiniTests` target in Xcode. This means tested code must have
`internal` or higher access level by default — do not add `public` solely to
satisfy tests.

**Rationale**: Avoids bypassing access control, keeps the test build honest,
and mirrors real client usage of the code under test.

**Node test runner (TypeScript)**: Tests use the Node.js native test runner
(`node:test`). Run with `bin/yarn test:node`.

**Test location (TypeScript)**: Test files live in
`AdguardMini/sciter-ui/tests/`, mirroring the module structure:

```
tests/
├── settings/         # Settings module store and component tests
├── tray/             # Tray module tests
├── common/           # Shared store and hook tests
├── stories/          # Story navigation tests
├── number/           # Number formatting tests
└── safariExtensions/ # Safari extension store tests
```

**Compilation (TypeScript)**: Tests compile via
`tsc -p tsconfig.node-tests.json`. The config defines path aliases and include
patterns for test files and their dependencies.

**Lint-staged test triggers**: When adding new TypeScript tests, the
`.lintstagedrc.js` file MUST be updated to include glob patterns for the
tested source files and the test files themselves, mapping them to
`yarn test:node`.

**Rationale**: Prevents regressions from slipping through code review by
catching failures at commit time.

### Dependency Management

- **Pin all dependency versions explicitly**. The current codebase uses caret
  ranges (`^x.y.z`) in `package.json`, which allow automatic upgrades to
  untested versions. This is a **known exclusion** to be fixed in the future.
  When adding new dependencies, pin to an exact version.
- **Prefer vanilla solutions**. Use the language's standard library and
  built-in APIs when they adequately solve the problem. Only add a dependency
  when it provides significant value over a vanilla implementation.
- **Reputable sources only**. Dependencies MUST come from well-established,
  actively maintained projects. Evaluate by download counts, repository
  activity, and known maintainers.
- **Avoid unpopular libraries**. Do NOT add niche or obscure packages with
  limited community adoption — they pose security risks and may become
  unmaintained.
- **Minimize dependency count**. Each new dependency increases attack surface,
  bundle size, and maintenance burden. Justify every addition.
- **Use the latest stable version**. When adding a new dependency, check the
  package registry for the latest stable release and use it. Do not copy
  outdated version numbers from memory or training data.
- **SafariConverterLib and @adguard/safari-extension versions MUST always be
  exactly the same** for compatibility. After updating either, verify and
  synchronize both.

**Rationale**: Fewer, well-vetted dependencies reduce security
vulnerabilities, supply chain risks, and long-term maintenance costs.

### Configuration & Documentation

- **Runtime configuration**: Build-time configuration is managed via
  `.xcconfig` files (`ConfigNative.xcconfig`, `ConfigMAS.xcconfig`,
  `CommonConfig.xcconfig`). A private template
  (`adguard-mini-private-template/`) provides the structure for secrets and
  signing identities. Never commit secrets.
- **User defaults**: Generated by the Prebuilder target from a schema
  (`AdguardMini/AdguardMini Prebuilder/UserDefaults.swift`).
- **Toolchain wrappers**: All Ruby and Node.js tools MUST be invoked via `bin/`
  wrappers (e.g., `bin/fastlane`, `bin/yarn`, `bin/ruby`, `bin/node`). Never
  hardcode tool paths or use `bundle exec`. The `configure.sh` script captures
  the toolchain and generates wrappers ensuring consistent tool versions across
  all environments.
- **Documentation sync**: When changing build commands, project structure,
  public API, or deployment processes, update the corresponding section in
  `AGENTS.md`. Also update `DEVELOPMENT.md` if environment setup steps change.
- **Import resolution via bundler injections**: Webpack `ProvidePlugin` in
  `scripts/webpack/webpack.config.base.js` injects these globals:
  `translate`, `aria`, `tx`, `cx`. They are available without explicit imports
  in TypeScript source. Do not flag missing imports for these injected globals.

**Rationale**: Eliminates PATH-dependent behavior, ensures reproducible
builds, and keeps documentation accurate.

### Markdown Formatting

All Markdown files MUST follow these formatting rules:

- **Line length**: Keep lines at most 80 characters, but don't overwrap
  artificially short just to hit the limit. Lines inside fenced code blocks
  are exempt.
- **Unordered lists**: Use dashes (`-`) for bullet points. Indent nested list
  items by 4 spaces.
- **Continuation lines**: When a list item wraps to the next line, align the
  continuation with the first character of the item text, not the list marker.
- **Emphasis**: Use asterisks (`*`) for emphasis (`*italic*`, `**bold**`). Do
  NOT use underscores.
- **Headings**: Duplicate heading names are allowed only among sibling
  headings (same parent level). Avoid duplicates across different levels.
- **Inline HTML**: Avoid raw HTML in Markdown. The only allowed elements are
  `<a>`, `<p>`, `<details>`, `<summary>`, and `<img>`.
- **Trailing spaces**: Do NOT leave trailing whitespace on any line. Do NOT
  use two-space line breaks — use a blank line instead.
- **Bare URLs**: Bare URLs are permitted and do not need to be wrapped in
  angle brackets.
- **Table formatting**: Align table columns with padding when the table fits
  within 80 characters. If the table exceeds 80 characters, use a compact
  format with single spaces only. The separator row should be written as
  `| --- |`, not `|--|`.

  ```markdown
  | Col1 | Col2 |
  | --- | --- |
  | Value1 | Value2 |
  ```

  Do NOT use extra padding or alignment characters beyond single spaces.

**Rationale**: Uniform Markdown formatting improves readability for both
humans and AI agents that consume project documentation.

### Other

**Localization**: The project supports 35 languages via TwoSky. Base locale is
English. Swift strings are in `.strings` files, TypeScript strings in JSON
files under `modules/common/intl/locales/`.

**Content Blockers**: There are 6 content blocker extensions (General, Privacy,
Security, Social, Other, Custom). Each has the same structure. Rules are split
across them due to Safari's per-extension rule limit.

**Rationale**: Safari limits the number of rules per content blocker
extension; splitting across 6 extensions maximizes total capacity.

**Callback services (TypeScript)**: Callbacks registered on
`window.API_CALLBACK` MUST call store action methods only. They MUST NOT
directly assign observable properties or orchestrate multiple stores in a
single callback handler. Multi-store coordination is acceptable at module
initialization time (e.g., `OnImportStateChange`).

**Rationale**: Keeps callback logic predictable and testable; avoids bypassing
store validations and computed property invalidation.
