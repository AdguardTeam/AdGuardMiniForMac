---
name: figma-webview-diff
description: 'Compare the live AdGuard Mini WKWebView module (tray or settings) against its Figma design and fix LAYOUT discrepancies — element placement, sizing, spacing, and colors — rather than chasing pixel-perfect parity. Use for design-to-implementation layout QA, validating that a rebuilt screen is structured correctly, or resolving UI layout/color/size mismatches. Human-in-the-loop: pauses after each rebuild for the user to open and verify the exact screen.'
argument-hint: 'Figma selection URL + module (tray|settings), e.g. https://www.figma.com/design/<key>/<name>?node-id=1-2 tray'
---

<!-- SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later -->

# Figma ↔ WebView Layout Diff & Fix

Pair a **live WKWebView screenshot** of the running AdGuard Mini app with the
matching **Figma design screenshot**, compare them with the `ui_diff_check`
tool, and when they diverge, fix the **layout** — how elements are placed,
their sizes, spacing, and colors — using Figma design context
(`get_design_context` / `get_variable_defs`) and the project's TypeScript UI
sources.

**Goal is layout fidelity, not pixel parity.** The aim is a correct,
well-structured layout: elements in the right places, at the right sizes and
colors. Do not chase pixel-identical rendering (anti-aliasing, font hinting,
dynamic placeholder text, hover/focus chrome). Treat Figma as the source of
truth for *intended values* (sizes, spacing, colors, typography, alignment) and
the WebView screenshot as the thing to bring into line with that structure.

This skill is **human-in-the-loop**: after every code fix + rebuild you MUST
stop and ask the user to open the exact screen in the running app and confirm it
before re-capturing. Never claim "matches now" from a stale capture.

## When to Use

- Verifying that a rebuilt tray/settings screen has the correct layout against
  the Figma design (element placement, sizes, colors, spacing, alignment).
- Checking a WebView screen's structure and color/size fidelity against its
  Figma source after a change.
- Triaging "this screen looks wrong / something is misplaced / sizes are off /
  colors are wrong" reports against the design of record.
- Confirming a layout fix resolved a previously-reported discrepancy.

## Prerequisites

1. **Running app**: the DEBUG build of AdGuard Mini must be launched (usually
   from Xcode) AND the exact target screen must be open in the module. The
   capture tool attaches to the live app; it cannot navigate to a sub-page.
2. **Screenshot tool**: `./Support/Scripts/webview-screenshots/webview-screenshot`
   (Python stdlib only). Requires macOS **Screen Recording** + **Accessibility**
   privacy permissions. Supports `tray` and `settings` modules only.
3. **Figma MCP** connected (`get_screenshot`, `get_design_context`,
   `get_variable_defs`, `get_metadata`).
4. **Visor MCP** connected (`ui_diff_check`, `analyze_image`).
5. **Figma selection link**: a design-file URL that includes `node-id`, e.g.
   `https://www.figma.com/design/<fileKey>/<name>?node-id=123-456`.

## What the Screenshot Tool Can Reach

| Module | Supported? | Notes |
|--------|-----------|-------|
| `tray` | ✅ | Non-key status-bar panel; the user must keep it open while you capture. |
| `settings` | ✅ | Top-level `AdGuard Mini` window (width ≥ 600). |
| `onboarding`, `userrules`, `inline` | ❌ | Not targetable by the tool today. Fall back to `webview-screenshot list` to read the CG window id, then capture manually with `screencapture -l <id>`. Flag this limitation to the user. |

## Inputs Gathered Up Front

Collect these at the start, either from `$ARGUMENTS` (the user's prompt) or by
asking with `vscode_askQuestions`:

1. **Figma selection URL** — must contain `node-id`. Parse it (see below).
2. **Module** — `tray` or `settings`.
3. **Which exact screen/state** is shown (e.g. "Filters tab, collapsed filters
   list") and confirmation that it is currently open in the running app.

If any of these are missing, ask before proceeding. Do not guess a `node-id` or
`fileKey` — the Figma tools reject empty/guessed values.

### Figma URL parsing

From `https://www.figma.com/design/<fileKey>/<name>?node-id=<a>-<b>` extract:
- `fileKey` = `<fileKey>` (path segment after `/design/`)
- `nodeId` = `<a>:<b>` (replace the dash with a colon)

For a **branch** URL (`/design/<fileKey>/branch/<branchKey>/<name>`), use
`<branchKey>` as the `fileKey`. If the URL has no `node-id`, ask the user for a
node-specific link.

## Procedure

### 1. Capture the reference (Figma) screenshot

Call the Figma `get_screenshot` tool with `nodeId`, `fileKey`, and
`maxDimension: 2048` (high enough to inspect fine spacing/typography; lower to
`1024` for thumbnails).

The response returns a **short-lived PNG URL** plus `curl` instructions. Keep
this URL — you will pass it straight to `ui_diff_check`.

### 2. Capture the actual (WebView) screenshot

Screenshots are stored in the project-root `.screenShotsReview/` folder (it is
gitignored and created automatically by the capture command):

```sh
SHOTDIR=".screenShotsReview"
mkdir -p "$SHOTDIR"
WEBVIEW_PNG="$SHOTDIR/webview-<module>.png"
```

For the tray, ask the user to keep the popover open so focus loss does not
dismiss it before you capture.

Capture (the user must already have the exact screen visible):

```sh
./Support/Scripts/webview-screenshots/webview-screenshot capture <module> "$WEBVIEW_PNG"
```

If capture reports "No open <module> window found": run
`webview-screenshot list` to confirm the window exists, ask the user to open the
screen, then retry. Capture uses `screencapture -l <CGWindowID>` and is
coordinate-independent (multi-display safe).

### 3. Run the visual diff

Use the Visor `ui_diff_check` tool:

- `expected_image_source` = the **Figma screenshot URL** from step 1
  (no need to `curl` it down — the tool accepts HTTPS URLs).
- `actual_image_source` = the **absolute path** to the captured
  `.screenShotsReview/<module>.png`. Pass the literal absolute path (MCP tools
  do not expand shell variables), e.g.
  `/path/to/repo/.screenShotsReview/tray.png`.
- `prompt` — adapt the template in [references/diff-prompt.md](./references/diff-prompt.md),
  which focuses the comparison on **layout** (placement, sizes, spacing, colors,
  alignment) rather than pixel-identical rendering.

If `ui_diff_check` cannot fetch the HTTPS URL, download the reference first
(needs network access for `curl`):

```sh
curl -L "<figma url>" -o ".screenShotsReview/figma-<module>.png"
```

…then pass that absolute path as `expected_image_source`.

### 4. If there are differences → diagnose & fix loop

**4a. Map each discrepancy to authoritative design facts.** For every reported
issue, gather the design of record:

- Call `get_design_context(nodeId, fileKey, clientLanguages="typescript",
  clientFrameworks="preact")` for the node (drill into sub-nodes via
  `get_metadata` first when the discrepancy is inside a child). Before calling
  `get_design_context`, load the figma-design-to-code guidance: prefer the
  `/figma-design-to-code` skill, otherwise read the
  `skill://figma/figma-design-to-code/SKILL.md` MCP resource.
- Call `get_variable_defs(nodeId, fileKey)` for exact design tokens (colors,
  font family/size/weight, spacing, radii).
- Treat the WebView screenshot as ground truth for layout positions, but
  Figma as ground truth for intended values. Per `AGENTS.md` design-fidelity
  rule: every value you change MUST trace to Figma; mark anything you infer
  as `[ASSUMPTION]` and confirm it with the user.

**4b. Locate the source.** Find the matching TypeScript/Preact component under
`AdguardMini/ui/modules/<module>/` (and shared code in
`modules/common/`). Use the `Explorer` subagent or `grep_search` rather than
guessing. See [references/discrepancy-source-map.md](./references/discrepancy-source-map.md)
for common symptom → file-area hints.

**4c. Apply the fix** following the Code Guidelines in `AGENTS.md`:
- Card-based composition, design tokens from Figma, localization for user-facing
  strings, no `[DBG]` logging, top-level documentation comments (JSDoc).
- Check `AdguardMini/ui/@types` custom type definitions before editing TS.
- Do not flag as "missing import" globals provided by webpack `ProvidePlugin`
  (see `scripts/webpack/webpack.config.base.js`).

**4d. Rebuild.** For UI-only changes:

```sh
yarn build:dev
```

`yarn build:dev` only refreshes `AdguardMini/MiniResources/WebUI/` in the
source tree — the running app keeps serving the `WebUI` copy inside its `.app`
bundle. Use `yarn syncUI` (build + inject into the existing build + relaunch),
or `yarn start` in one terminal plus `yarn watchProject` in another, to make
changes visible without an Xcode rebuild.

**4e. STOP — human-in-the-loop checkpoint.** Do NOT auto-recapture. Use
`vscode_askQuestions` to pause and ask the user, e.g.:

> I've rebuilt the `<module>` UI with fixes for: <list>. Please open
> **<exact screen>** in the running app now and confirm it's fully loaded,
> then tell me how to proceed.

Offer options like: "Screen is open — re-capture & re-diff", "Something's off,
let me describe", "Stop here". Only after the user confirms the exact screen is
open do you proceed back to **step 2** (re-capture) and **step 3** (re-diff).

### 5. Converge or hand off

Repeat 4a–4e until `ui_diff_check` reports no significant differences or the
user accepts the result. Always run **quality gates** before declaring done
(per `AGENTS.md`):

- `yarn lint` on changed TypeScript files — no new ESLint errors.
- SwiftLint if any Swift changed: `swiftlint lint --config .swiftlint.yml
  --working-directory AdguardMini`.
- Build + tests if Swift was touched.

Report a concise summary: which discrepancies were found, which source files
were changed, the final diff status, and any `[ASSUMPTION]`s left open.

## Tool Reference

| Goal | Tool / command | Key params |
|------|-----------------|------------|
| Figma reference render | `figma.get_screenshot` | `nodeId`, `fileKey`, `maxDimension=2048` |
| Design context + ref code | `figma.get_design_context` | `nodeId`, `fileKey`, `clientLanguages="typescript"`, `clientFrameworks="preact"`. Load figma-design-to-code guidance first. |
| Design tokens | `figma.get_variable_defs` | `nodeId`, `fileKey` |
| Node structure (drill-down) | `figma.get_metadata` | `fileKey`, optional `nodeId` |
| Visual compare | `visor-mcp.ui_diff_check` | `expected_image_source`, `actual_image_source`, `prompt` |
| Fallback image analysis | `visor-mcp.analyze_image` | `image_source`, `prompt` |
| List app windows | `webview-screenshot list` | — |
| Capture module | `webview-screenshot capture <module> <out.png>` | `tray` | `settings` |
| Rebuild UI | `yarn build:dev` | — |
| Rebuild UI + inject into built app + relaunch | `yarn syncUI` | — |
| Watch + hot-swap into built app | `yarn start` + `yarn watchProject` | — |
| Live app sub-page driving | Web Inspector (Develop menu) — synthetic clicks don't reach the tray WebView | — |

## Constraints & Pitfalls

- **Never reuse a stale capture.** After any rebuild, re-capture only once the
  user confirms the exact screen is open.
- **The tool cannot navigate inside a WebView.** The user must open the precise
  screen/state; you cannot click into it programmatically (synthetic events
  don't reach the tray WebView).
- **`$ARGUMENTS` may already contain the Figma URL + module.** Parse it first
  instead of re-asking; only ask for what's genuinely missing.
- **Absolute paths only** for MCP `image_source` file inputs — pass the literal
  path to `.screenShotsReview/<file>` (the repo's absolute root + the relative
  path), not shell variables.
- **Don't invent UX details.** Counts, icons, text, spacing must come from
  Figma. Mark inferred values `[ASSUMPTION]` (`AGENTS.md` §VI.6).
- **Layout focus:** the goal is a *correct layout*, not a pixel-perfect clone
  of the Figma render. Tell `ui_diff_check` to ignore anti-aliasing, font
  hinting, and dynamic/placeholder-text rendering, but to flag every structural,
  placement, sizing, spacing, color, typographic, and alignment difference.
  Elements must be in the right place, at the right size, in the right color —
  that is what "matches" means here.
