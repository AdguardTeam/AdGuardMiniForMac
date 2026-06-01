<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# AdGuard Mini E2E UI Tests

End-to-end smoke tests and visual regression tests for AdGuard Mini's
Sciter-rendered UI modules (tray, settings, onboarding). Uses
`@adg/sciter-test-driver` over TCP and Node.js native test runner.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Smoke Tests](#smoke-tests)
- [Visual Regression Tests](#visual-regression-tests)
- [Architecture](#architecture)
- [Restrictions & Known Issues](#restrictions--known-issues)
- [Adding New Tests](#adding-new-tests)
- [Improvement Recommendations](#improvement-recommendations)

---

## Prerequisites

- **Node.js 22+** (required for `--experimental-strip-types`)
- **AdGuard Mini test build**: `yarn build:test` (from project root)
- **AdGuard Mini running in debug mode** — the test peer (`test-peer.js`)
  starts automatically when the app is launched with a test build.
  Each module listens on its own TCP port.

---

## Quick Start

```bash
# 1. Build the test variant (from project root)
yarn build:test
```

# 2. Launch AdGuard Mini (test-peer starts on ports 7127-7129)
```bash
yarn watchProject
```

# 3. Run all smoke tests (from this directory)
cd AdguardMiniUiTests
yarn test:e2e

# 4. Run visual regression tests for Settings
yarn test:visual --module=settings --timeout=30000
```

---

## Test Structure

```
AdguardMiniUiTests/
├── README.md                       # This file
├── package.json                    # Dependencies (pixelmatch, sharp)
├── run.mjs                         # Smoke test runner (CLI entry point)
├── run-visual.mjs                  # Visual test runner (CLI entry point)
├── test-ids.json                   # Test ID manifest for smoke tests
├── test-ids.md                     # Test ID reference documentation
│
├── helpers/
│   ├── driver.ts                   # SciterDriver connection with retry logic
│   ├── smoke.ts                    # Generic smoke test generator
│   ├── visual.ts                   # Screenshot capture + pixelmatch comparison
│   ├── visual-reporter.mjs         # Self-contained HTML report generator
│   └── reporter.mjs                # Smoke test HTML report generator
│
├── settings/
│   ├── smoke.test.ts               # Settings smoke tests (auto-generated)
│   ├── menu-navigation.test.ts     # Settings sidebar menu navigation tests
│   ├── user-rule-creation.test.ts  # User rule creation workflow tests
│   └── visual/
│       ├── all.test.ts             # Combined visual regression tests (preferred)
│       ├── components.test.ts      # Element-level visual tests (fallback)
│       └── pages.test.ts           # Full-page visual tests (fallback)
│
├── tray/
│   └── smoke.test.ts               # Tray smoke tests
│
├── onboarding/
│   └── smoke.test.ts               # Onboarding smoke tests
│
├── baselines/                      # Git-tracked reference screenshots
│   └── settings/                   #   (per module, created via --update)
│
├── results/                        # Runtime outputs (gitignored)
│   ├── settings/
│   │   ├── actual/                 # Captured screenshots
│   │   └── diffs/                  # Diff images on mismatch
│   └── ...other modules...
│
└── reports/                        # HTML reports (gitignored)
    └── visual-report-*.html
```

---

## Smoke Tests

Smoke tests verify that every page in a module renders all its declared
test IDs. They are **auto-generated** from `test-ids.json` — no per-test
code is needed when adding new elements.

### Running Smoke Tests

```bash
# All modules (tray + settings)
yarn test:e2e

# Specific module
yarn test:e2e -- --module=settings

# Custom timeout for slow connections
yarn test:e2e -- --module=settings --timeout=15000
```

### How Smoke Tests Work

1. The runner (`run.mjs`) spawns `node --test` with the test files
   for the requested module(s).
2. Each test file calls `runSmokeTests()` from `helpers/smoke.ts`,
   which reads the manifest from `test-ids.json`.
3. For each page in the flow:
   - Navigate (click a menu item or eval JS if specified)
   - Verify the page container (`#pageId`) is visible
   - Verify each declared element is present in the DOM
4. An HTML report is saved to `reports/`.

### Adding New Smoke Test Elements

1. Add the test ID to the relevant UI component (as the `id` attribute)
2. Document it in `test-ids.md`
3. Add the new ID to the appropriate page in `test-ids.json`
4. Smoke tests pick it up automatically — no test code changes

---

## Visual Regression Tests

Visual tests capture screenshots of every Settings page and key interactive
components (toggles, modals, menu items) and compare them against stored
baselines using [pixelmatch](https://github.com/mapbox/pixelmatch).

### Running Visual Tests

```bash
# First run (creates baselines, all marked [NEW])
yarn test:visual --module=settings --timeout=30000

# Subsequent runs (compares against baselines)
yarn test:visual --module=settings --timeout=30000

# Update baselines after intentional UI changes
yarn test:visual:update --module=settings --timeout=30000
```

### CLI Options

| Flag | Default | Description |
|------|---------|-------------|
| `--module=<name>` | `settings` | Target module (`settings`, `tray`, `onboarding`) |
| `--timeout=<ms>` | `15000` | Per-test timeout + connection timeout |
| `--update` | `false` | Copy actual screenshots to `baselines/` |

### Package Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `test:e2e` | `node --experimental-strip-types run.mjs` | Run all smoke tests for tray + settings |
| `test:visual` | `node run-visual.mjs` | Run visual regression tests (default: settings) |
| `test:visual:update` | `node run-visual.mjs --update` | Run visual tests and update baselines |

### Test Suites

Visual tests are organized into two nested `describe` blocks within
`all.test.ts`:

| Suite | Tests | Description |
|-------|-------|-------------|
| `components` | 6 | Element-level screenshots (toggles, menu items, modal) |
| `pages` | 10 | Full-page screenshots of every Settings page |

**Total: 16 tests for the Settings module.**

### How Visual Comparison Works

1. Connect to the module's test peer via `SciterDriver`
2. Navigate to the target page (click sidebar menu, then sub-page link if needed)
3. For **modals**: open the modal (click trigger, then menu item) before capture
4. Capture a full-page or element-level screenshot
5. Save the actual screenshot to `results/<module>/actual/`
6. If a baseline exists in `baselines/<module>/`:
   - Decode both images to raw RGBA via `sharp`
   - Compare with `pixelmatch` (threshold: 0.1, max diff: 1%)
   - If mismatch: save diff image to `results/<module>/diffs/`
   - If pass: do nothing
7. If no baseline exists: mark as `[NEW]` (candidate for baseline)
8. Generate self-contained HTML report with embedded images

### Comparison Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Threshold | 0.1 | Per-channel color distance tolerance |
| Max diff % | 1% | Maximum fraction of differing pixels |
| Anti-aliasing | Ignored | AA pixels are excluded from diff |
| Dimension mismatch | Resized | Actual is resized to match baseline (with warning) |

### Baseline Management

Baselines are stored in `baselines/<module>/` and **should be committed**
to version control. Update them after intentional UI changes:

```bash
yarn test:visual:update --module=settings --timeout=30000
```

This re-captures all screenshots and overwrites the stored baselines.
Always run `yarn test:visual` afterwards to verify the new baselines pass.

---

## Custom Smoke Tests

In addition to auto-generated smoke tests, there are manually written tests
for specific workflows:

### Settings Menu Navigation (`settings/menu-navigation.test.ts`)

Verifies that clicking each sidebar menu item navigates to the correct
page. Tests all 7 sidebar entries (Safari Protection, Advanced Blocking,
User Rules, Settings/General, License, Support, About) by clicking the
menu element and asserting the target page container is visible.

### User Rule Creation (`settings/user-rule-creation.test.ts`)

End-to-end workflow test that simulates creating a blocking rule:

1. Navigate to the User Rules page
2. Click "Create rule" to open the rule editor
3. Fill the domain input with a test domain
4. Select a content type (e.g., Images) from the Dropdown
5. Select "Apply to websites" modifier (e.g., "Only this")
6. Verify the preview text shows the compiled rule
7. Submit the rule and verify it appears in the rules list

Uses `SciterDriver` to interact with native DOM elements:
- Dropdowns: click header to open, then click `<li>` by index
- Native `<select>`: use `setValue()` which dispatches `input`/`change` events
- Checkboxes: click via `SciterElement.click()`

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   AdGuard Mini App                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Sciter Window (settings.html)                    │   │
│  │  ┌────────────────────┐  ┌──────────────────┐    │   │
│  │  │ Preact UI          │  │ test-peer.js      │    │   │
│  │  │ (React components) │  │ TCP server        │    │   │
│  │  │                    │  │ port 7128          │    │   │
│  │  └────────────────────┘  └────────┬─────────┘    │   │
│  └───────────────────────────────────┼──────────────┘   │
└──────────────────────────────────────┼──────────────────┘
                                       │ TCP (length-prefixed JSON)
                                       │
┌──────────────────────────────────────┼──────────────────┐
│  Node.js Test Runner                  │                  │
│  ┌─────────────────────────────────┐ │                  │
│  │ SciterDriver (src/driver.mjs)   │ │                  │
│  │  • connect(host, port, timeout) │◄┘                  │
│  │  • findElement(selector)        │                    │
│  │  • click(), eval(), screenshot()│                    │
│  └──────────┬──────────────────────┘                    │
│             │                                           │
│  ┌──────────▼──────────────────────────────────────┐   │
│  │ Test Files                                      │   │
│  │  all.test.ts   smoke.test.ts                    │   │
│  │  menu-navigation.test.ts  ...                   │   │
│  └──────────┬──────────────────────────────────────┘   │
│             │                                           │
│  ┌──────────▼──────────────────────────────────────┐   │
│  │ Helpers                                         │   │
│  │  driver.ts — connectWithRetry()                  │   │
│  │  visual.ts — captureAndCompare(), compareImages()│   │
│  │  smoke.ts — runSmokeTests()                     │   │
│  │  visual-reporter.mjs — HTML report generation   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Port Map

| Module | Port | Purpose | Standalone |
|--------|------|---------|------------|
| `tray` | 7127 | System tray popup | No |
| `settings` | 7128 | Settings window | No |
| `onboarding` | 7129 | First-run wizard | Yes |
| `userrules` | — | User rules editor (WebView) | Yes |

**Standalone modules** (onboarding, userrules) run in their own window and
do not coexist with the main app windows. They must be tested separately.

The `userrules` module runs in a WebView (not Sciter) and uses a different
communication mechanism — no test peer port is assigned.

### Test Peer Protocol

The Sciter window loads `test-peer.js` (from `@adg/sciter-test-driver`),
which opens a TCP server on the configured port. The Node.js process
connects as a client and communicates via length-prefixed JSON messages:

```
┌─────────┬──────────────────────────────┐
│ 4 bytes │  UTF-8 JSON payload          │
│ (length)│  {"cmd":"findElement",        │
│ big-end │   "id":1,"data":{...}}        │
└─────────┴──────────────────────────────┘
```

---

## Test Data Files

### `test-ids.json`

Central manifest that defines the page flow and expected element IDs for each
module. Structure:

```typescript
interface ModuleManifest {
    /** Ordered list of pages to test. */
    flow: PageSpec[];
    /** If true, this module runs in its own window. */
    standalone?: boolean;
}

interface PageSpec {
    /** DOM id of the page container. */
    pageId: string;
    /** Optional navigation to reach this page. */
    navigate?: { click?: string; eval?: string };
    /** Test IDs to verify on this page. */
    elements: string[];
}
```

Modules: `tray` (2 pages), `onboarding` (6 pages), `settings` (9 pages),
`shared` (1 page), `userrules` (1 page).

### `test-ids.md`

Auto-generated reference documentation listing every test ID with:
- Module name
- Source file path
- Element description

Covers 5 modules across ~130 test IDs, including dynamic IDs for stories,
filters, groups, rules, and theme options.

---

## Restrictions & Known Issues

### 1. Test Peer: Single Client Only

The Sciter `test-peer.js` accepts **only one TCP client at a time**.
If a second client connects while one is active, it receives a `"busy"`
error and is rejected. This means:

- **All visual test suites for one module must share a single driver
  connection.** That's why `all.test.ts` exists — it combines component
  and page tests into one `describe` block with shared `before`/`after`.
- **You cannot run visual tests for different modules simultaneously.**
- **Two test files cannot both connect to the same port** in a single
  `node --test` invocation. Always use the combined `all.test.ts` approach.

### 2. Sciter QuickJS Limitations

Sciter uses QuickJS, not a full browser engine. Key differences:

- `MouseEvent` is **not available** — use `new Event('mousedown', ...)` instead
- `Array.from()` and arrow functions may work differently — prefer
  `Array.prototype.slice.call()` and `function()` syntax in eval code
- `for...of` loops may not work in eval code — use indexed `for` loops
- CSS module class names are mangled — never rely on them in selectors

### 3. Element Visibility

- The test peer's `isVisible()` checks `elementState.visible`, which
  may not match CSS `display: none` or `visibility: hidden` exactly.
- Modals rendered conditionally (`{isOpen && <Modal/>}`) **do not exist**
  in the DOM when closed — trying to `findElement()` them will fail.
- Always navigate to the correct page before searching for elements.

### 4. Baseline Drift Over Time

- Baselines are exact pixel comparisons. Minor rendering differences
  (font rendering, OS version, Sciter version) can cause false failures.
- The 1% threshold and 0.1 color tolerance absorb minor antialiasing
  differences but not layout shifts.

### 5. Timeout Handling

- The `E2E_TIMEOUT` env var controls both connection retry duration
  and per-test timeout. If the app window isn't ready, tests wait
  the full timeout before failing.
- The visual test runner has a hard 120s timeout per spawned process.

### 6. WebView Modules Not Accessible

The `userrules` module (full-page rule editor) runs in a system WebView,
not in Sciter. The `@adg/sciter-test-driver` cannot connect to it, so
userrules UI is excluded from smoke tests and visual regression tests.
Only the `userrules-editor-page` manifest exists in `test-ids.json` for
documentation purposes.

### 7. Dropdown Interaction via Index

The content-type Dropdown in the rule editor is a custom `<div>`-based
component. Options must be selected by index using `findElements()`
and clicking the matching `<li>` element. Text-based selectors won't
work because the options lack unique IDs.

---

## Adding New Tests

### Adding a New Component Screenshot

1. Add a new entry to `COMPONENT_SCREENSHOTS` in `all.test.ts`:
   ```typescript
   {
       name: 'my-toggle', type: 'element', pageId: 'settings-general-page',
       selector: '#settings-general-my-toggle',
       navigate: { click: '#settings-menu-settings' },
   },
   ```
2. Run tests to generate the baseline: `yarn test:visual:update`
3. Verify the baseline passes: `yarn test:visual`

### Adding a New Page Screenshot

1. Add a new entry to `PAGE_SCREENSHOTS` in `all.test.ts`
2. If the page is a **sub-page** (accessible via a link on the general
   page), add its pageId to `SUB_PAGE_NAV`:
   ```typescript
   const SUB_PAGE_NAV: Record<string, string> = {
       'settings-my-page': '#settings-general-my-link',
   };
   ```
3. Run and update baselines

### Adding a New UI Module

1. Add the module to `validModules` in `run-visual.mjs`
2. Create `helpers/<module>/visual/all.test.ts` following the pattern
   from `settings/visual/all.test.ts`
3. Add the module to `MODULES` in `helpers/driver.ts` with a unique port
4. Add test peer port config in `webpack.config.test.js`
5. Run `yarn build:test` and verify

---

## Improvement Recommendations

### High Priority

1. **Restart test peer between connections**
   The `test-peer.js` should be updated to gracefully handle
   disconnection and reconnection. Currently, after a client disconnects,
   a new connection attempt may receive stale data or fail silently.
   Adding a small delay (500ms) between test file runs in `run-visual.mjs`
   would mitigate this, but the better fix is in the peer itself.

2. **Add visual tests for Tray and Onboarding modules**
   Currently only Settings has visual regression tests. Extending
   coverage to Tray and Onboarding would catch regressions across
   the entire UI surface.

3. **Test across multiple Sciter versions in CI**
   Baseline images can differ between Sciter SDK versions. Adding a
   CI step that regenerates baselines when the Sciter SDK is updated
   would prevent stale baseline failures.

### Medium Priority

4. **Parallel module testing**
   The single-client limitation means modules must be tested serially.
   If the test peer were updated to support multiple concurrent clients
   (one per module port), visual tests for tray + settings could run
   in parallel, cutting total CI time in half.

5. **Automatic baseline pruning**
   When a test or screenshot spec is removed, the corresponding baseline
   file becomes orphaned. Add a script that prunes `baselines/` of files
   with no corresponding test spec.

6. **Floating thresholds per screenshot**
   Some elements (animated toggles, loading spinners) are inherently
   more volatile. Allowing per-spec `maxDiffFraction` would let those
   tests use a higher threshold without weakening others.

### Low Priority

7. **CI-friendly diff report**
   The HTML report is self-contained and useful for local debugging,
   but in CI it's just a file. Adding a JUnit XML output or a Slack
   summary with diff percentages would make CI integration smoother.

8. **Element screenshot bounding-box verification**
   Before capturing an element screenshot, verify that the element's
   bounding box is within the window dimensions. Elements rendered
   off-screen (e.g., below the fold in a scrollable page) may produce
   empty or clipped screenshots.

9. **Test isolation via page reset**
   Tests currently share state — clicking a menu item in one test
   changes the active page for the next. If tests become order-dependent,
   add a `reset()` or `navigateHome()` step before each spec.

10. **Accessibility checks in smoke tests**
    Smoke tests verify that elements exist but don't check accessibility
    attributes (`aria-label`, `role`, `tabindex`). Adding basic a11y
    assertions would catch common accessibility regressions.

11. **Add smoke tests for the Settings sub-pages**
    Sub-pages (filters, theme, quit-reaction) are tested visually but
    not covered by the auto-generated smoke tests. Adding them to
    `test-ids.json` would ensure element visibility is verified.

12. **Add visual tests for onboarding flow**
    The onboarding module has complex multi-step navigation with modals,
    which is a high-risk area for regressions. Visual tests across the
    6-step flow would complement the existing smoke tests.

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@adg/sciter-test-driver` | — | TCP client for Sciter test peer communication |
| `pixelmatch` | 6.0.0 | Pixel-level image diff algorithm |
| `sharp` | 0.33.5 | Image decode/resize/encode for comparison |

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| All tests timeout | App not running / wrong build | Launch AdGuard Mini, verify `yarn build:test` was run |
| `No element matches selector` | Wrong page / element not rendered | Check navigation in test spec, verify testId exists in UI |
| `Command 'ping' timed out` | Test peer busy / stale connection | Kill and relaunch AdGuard Mini |
| `Test peer: busy` | Two clients connected simultaneously | Use combined `all.test.ts` instead of separate files |
| Diff failures on every run | Baseline vs actual mismatch | Update baselines with `--update` |
| `ERR_INVALID_TYPESCRIPT_SYNTAX` | TypeScript syntax error in test | Check for extra braces, invalid `for...of` in eval code |
| User rule tests fail on dropdown | Dropdown index changed | Update `CONTENT_TYPE_INDEX` in `user-rule-creation.test.ts` |
| Visual tests all show `[NEW]` | Baseline directory missing/empty | Run `yarn test:visual:update` to create baselines |
