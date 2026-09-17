<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# Keyboard Focus and Activation QA Matrix

Manual verification matrix for keyboard focus and activation in the four
WebView modules (tray, settings, onboarding, user rules). The automated half
of the check is the lint/test/build roll-up listed under Static Pre-Checks.

Every row is executed by a human on a built app. All result cells are
`Pending` until that pass happens.

## How To Run

- Build: `bin/yarn build:dev`; launch the Debug-Standalone app for
  development passes; execute the release pass on a release-candidate build
  of the same tree.
- Evidence: `Support/Scripts/webview-screenshots/webview-screenshot capture
  tray|settings` (Screen Recording + Accessibility permissions); save the
  files under a gitignored directory such as `.screenShotsReview/`.
- Theme pass: Settings → Theme; run every row in Light first, switch to
  Dark, repeat; record both `Light` and `Dark` cells per row.
- Result values: `Pending` (initial), `Pass`, `Fail`, `N/A`; for a failure
  record module, control, expected, actual, and the screenshot path in the
  row's `Notes` and in the execution log.
- One-pass order: Settings → User rules → Tray → Onboarding, then edge
  cases and global rows; row-specific preconditions are in the row `Notes`.
- Honesty rule: never mark a row `Pass` without observing it.
- Regression baseline: page/step heading focus on mount, `Select` keyboard
  handling, tray story arrow navigation and the modal focus trap must be
  re-verified unchanged.

## Control Classes

| Class | Example components | Expected indicator / behavior |
| --- | --- | --- |
| Standard button | `Button` (text/icon variants), modal submit/cancel, `NavigationHeader` back | 2px `#7884CB` ring, default offset; Enter/Space activate once |
| Link | `ExternalLink`, clickable `Text` | floating-offset ring; Enter activates |
| Checkbox | `Checkbox` (settings + onboarding usages) | contained ring around the whole row; Space/Enter toggles once |
| Switch | `Switch` (settings usages) | contained ring; Space/Enter toggles once |
| Radio | `Radio` (Theme, Quit Reaction, System-wide Protection) | contained ring; Space/Enter selects once |
| Menu row | side-menu `MenuItem`, context-menu rows | contained ring; Enter/Space activates once |
| Settings row | `SettingsItem` route/toggle rows and title lines | contained ring; Enter/Space activates once |
| Card | story card, show-hidden card, onboarding start card | default ring; Enter/Space activates once |
| Icon action | close icons, icon `Button`, user-rules flag `Icon` | floating ring for shared `Icon`, default for `Button` icons; Enter/Space |
| Dropdown | `Dropdown` header/options; `Select` header | header contained ring (options lifecycle in `SET-9`); `Select` border-only |
| Text input | `Input`, `Textarea`, `Select` | existing focus border only — no ring |

## Static Pre-Checks

- `bin/yarn lint --quiet` enforces the four keyboard a11y rules as errors
  (`click-events-have-key-events`, `no-static-element-interactions`,
  `no-noninteractive-element-interactions`, `control-has-associated-label`)
  in the CI `ts-lint` lane.
- `bin/yarn test:node` runs the pure-helper tests (activation predicate,
  input modality, focus-restore target resolution) in the `ts-test` lane.
- The focus ring is declared once as the `focus-ring` mixin in
  `common/theme/default/mixins.css`; a compiled-CSS check can confirm that
  each module's `style.<module>.css` carries the `--focus-ring-color`
  outline instead of counting per-component copies.
- AGENTS.md item 16 documents the ring, activation keys, modality fallback
  and the no-silent-outline-removal rule.

## Execution Log

One row per human execution; the initial state is unexecuted.

| Date | Build / variant | Executed by | Rows run | Summary | Notes |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
| — | — | — | — | — | Not executed — all rows `Pending` (GUI pass parked) |

Current status: **not executed** — all runtime rows are `Pending`.

## Tray

| ID | Where | Control / state | Action | Expected | Light | Dark | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TRAY-1 | Tray → Home | whole page | Tab from the first to the last control and continue | Cycle visits the updates button, settings button, protection switch, each story card, each Hide caption (when hideable) and the show-hidden card (when present) exactly once in document order, ring on each; no stop on the protection title or strip arrows; no stall | Pending | Pending | |
| TRAY-2 | Tray → Home "Fix it" links | standalone build; some extensions disabled / all disabled | Tab to each link, then Enter/Space, then click | floating ring; Safari extension preferences open once; telemetry only in the some-disabled state; click unchanged | Pending | Pending | Standalone build only. |
| TRAY-3 | Tray → Home story card + Hide | story card and its Hide caption | Tab, Enter/Space, click each | default ring on the card, floating on Hide; each action runs once; Hide never also opens the story; click unchanged | Pending | Pending | |
| TRAY-4 | Tray → Home show-hidden card | ≥2 hidden stories | Tab, Enter/Space, click | default ring; hidden stories restored once; click unchanged | Pending | Pending | |
| TRAY-5 | Tray → CheckUpdates | results ready and checking/up-to-date | Tab through both states | order `back → [update] → filters row (ready only) → [try again]`; the app status row is skipped; the filters row has a contained ring and navigates once in the ready state, is not a stop otherwise | Pending | Pending | |
| TRAY-6 | Tray → FiltersUpdate | status page | Tab through | only the back button stops; rows receive no focus | Pending | Pending | |
| TRAY-7 | Tray → stories layer | dialog open | open a story, Tab | trap active; close button, left zone (when shown), right zone and frame buttons each ring; heading shows no ring; the arrow zone becomes visible on focus; Enter/Space on a zone moves one frame; ArrowLeft/ArrowRight frame/story navigation unchanged | Pending | Pending | |
| TRAY-8 | Tray → stories layer opened from a story card with Enter/Space | focus restore | close via the close control | focus returns to the story card; arrows unchanged | Pending | Pending | |
| TRAY-9 | Tray panel | first open; reopen after outside click; reopen after Cmd+Tab away | Tab immediately in each state, no prior click | the first Tab shows a ring inside the panel in every state with no prior click; if not, raise a separate Swift host follow-up | Pending | Pending | A failure here is a Swift host issue. |

## Settings

| ID | Where | Control / state | Action | Expected | Light | Dark | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SET-1 | Settings → side menu | `MenuItem` items | Tab each item, Enter/Space, click | contained ring; navigation once; `aria-current` unchanged; click unchanged | Pending | Pending | |
| SET-2 | Settings rows | About update row; License activation-code row; Already Purchased modal rows; any `SettingsItemLink` route row; plus a disabled link row | Tab to each (or its title line), Enter/Space, click; repeat on the disabled row | contained ring on the focused row/line; action/navigation once; disabled row does nothing and is skipped | Pending | Pending | |
| SET-3 | Settings subpage header | Back button | Tab, then Enter/Space, Escape and click | default ring; each closes or returns once | Pending | Pending | |
| SET-4 | Settings buttons and links | About copy icon; modal close/submit/cancel; inline text button; Support Contact submit; `ExternalLink` (About, Filters, custom filter row) | Tab/Shift+Tab/Escape to move the ring; Enter/Space, then click | 2px ring (floating offset on links); click leaves no ring; the disabled Support Contact submit is skipped with no ring; modal close/notification close/About copy icon rings unchanged | Pending | Pending | |
| SET-5 | Settings selection controls | checkbox usages (~10 files) and switch usages (3 files) | Tab, activate, hold the key, `Alt+Space`, click, then disable the setting | ring wraps the whole row; exactly one toggle per press; no repeat toggle; no page scroll; `Alt+Space` does nothing; click toggles once; disabled row unchanged | Pending | Pending | |
| SET-6 | Settings radio groups | Theme, Quit Reaction, System-wide Protection | Tab each group, activate, hold the key, click | ring wraps the row; each activation selects once; holding does not re-select or scroll; click selects once | Pending | Pending | |
| SET-7 | Settings text-entry controls | Filters search `Input`; a `Select`; a modal `Input`; a `Textarea` | Tab through | border-only focus, no ring | Pending | Pending | |
| SET-8 | Settings → User Rules pagination | more than 100 rules (lower `PAGE_SIZE` locally only, never commit) | Tab through the tiles, activate the numbers and both arrows | ring flush around each 32px tile; numbers/arrows activate once; ellipsis is not a stop | Pending | Pending | Lower `PAGE_SIZE` locally only, never commit. |
| SET-9 | Settings → User Rules dropdown lifecycle (single-select) | open/closed `Dropdown`; plus a multi-select | Enter/Space to open; Tab into the list; Tab past the last option; Shift+Tab from the first; Enter/Space to commit; Escape/outside click; padding click on multi-select | opens with focus and ring on the header; the first option rings on entry; commits once and closes to the header; Shift+Tab from the first option closes to the header; Tab past the last option closes without changing the value; multi-select keeps its open/toggle behavior; the closed list is unreachable; a padding click does not close a multi-select | Pending | Pending | Close paths are covered by `EDGE-4`/`EDGE-5`. |
| SET-10 | Settings → User Rules rule-row context menu | menu open via keyboard/mouse; right-click outside | Tab to an action; Enter/Space; choose an action; Escape; click outside; right-click outside | contained ring on actions; action runs once and the menu closes; Escape/outside returns focus to the trigger; choosing an action returns focus to the row; a right-click outside never leaves a hidden option active | Pending | Pending | |
| SET-11 | Paywall | close cross; mount-focused heading (`tabIndex={0}`); App Store promo price rows (`div` variant); advantages rows; footer "Already purchased" button | open the Paywall, Tab through, activate, close | close cross floating ring and closes once; the heading keeps heading focus on mount and shows the title-offset (+4px) ring when Tab reaches it; promo price rows default ring and each plan selects once; advantages rows are informational, not stops; the footer "Already purchased" button regains focus when the modal closes | Pending | Pending | |
| SET-12 | Settings modals | modal opened from the header context menu (Reset defaults/Clear statistics); loader modal (no controls); nested dialog | open a modal; Tab and Shift+Tab; close via Escape/Cancel/Submit | focus wraps inside and every dialog control rings; closing returns focus to the opener; the header-menu-opened modal falls back to the page heading; the loader modal raises no error and never lets focus escape; nested dialogs return focus inside the outer dialog | Pending | Pending | |
| SET-13 | Settings → Filters custom-filters group; Settings → User Rules | "Add custom filter"; "Create rule" | Tab, Enter/Space, click | opens the modal/editor once each; ring visible | Pending | Pending | |
| SET-14 | Settings → About (standalone, update available) | inline update action | Tab, Enter/Space; keep Space held to check scrolling | floating ring; requests the update once and does not scroll on Space | Pending | Pending | Standalone build with an update available. |
| SET-15 | Settings inline keyboard actions | About dependencies toggle and libraries copy; AdvancedBlocking real-time updates link; Filter language-specific link; SafariExtension "Fix" links (three); Settings telemetry modal link | Tab to each, Enter/Space, then click | each rings, activates once via Enter/Space, leaves no ring after a click | Pending | Pending | |
| SET-16 | ConsentModal | enable a consent-requiring filter | Tab to the paragraph text block | the focused paragraph text block shows the floating-offset ring | Pending | Pending | |
| SET-17 | Settings regression | `Select` keyboard handling | open the field, use its existing ArrowDown/ArrowUp behavior, commit with Enter, close with Escape | unchanged; the field keeps its focus border and shows no ring | Pending | Pending | |
| SET-18 | Settings (full traversal) | whole window | open Settings, Tab from the side menu through the page content and continue past the last control | every operable control is visited once in document order with its ring, disabled controls and retained informational stops are skipped, and focus cycles without stalling or landing on a non-operable element | Pending | Pending | Tab-stop inventory. |

## Onboarding

| ID | Where | Control / state | Action | Expected | Light | Dark | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ONB-1 | Onboarding → Start | whole step | Tab through | title, EULA checkbox, EULA/Privacy links, telemetry checkbox, "send data" link and Continue each ring exactly once in document order; no dead stops; heading focus on mount unchanged | Pending | Pending | |
| ONB-2 | Onboarding checkbox usages | EULA and telemetry checkboxes | Tab, activate, hold, `Alt+Space`, click | ring wraps the row; one toggle per press; no repeat; no scroll; click unchanged | Pending | Pending | |
| ONB-3 | Onboarding Start → telemetry "send data" link | link | Tab to it, Enter/Space, click | floating ring; the usage-data modal opens once; the telemetry checkbox does not toggle; click unchanged | Pending | Pending | |
| ONB-4 | Onboarding step titles | Start and step headings | Tab to each heading stop | title-offset (4px) ring | Pending | Pending | |
| ONB-5 | Onboarding → Extensions step | page title, action buttons, privacy link | Tab to each, Enter/Space and click | each rings and activates once | Pending | Pending | |
| ONB-6 | Onboarding → Ads/Trackers/Annoyances and Finish steps | back button, title, optional checkbox, secondary/primary buttons | Tab to each, Enter/Space and click | each rings and activates once; no dead stops | Pending | Pending | |
| ONB-7 | Onboarding → enable-extensions overlay | auto-shown or opened from a control | close the overlay | on close focus returns to the opener, or to the settings heading when auto-shown | Pending | Pending | |

## User Rules

| ID | Where | Control / state | Action | Expected | Light | Dark | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UR-1 | User rules editor window | whole window | Tab through | editor surface, Save button, editor subtitle link and the flag icon (now the shared `Icon`, a real tab stop) each ring; no dead stops; heading focus unchanged | Pending | Pending | |
| UR-2 | User rules flag icon | shared `Icon` action | Tab to it, Enter/Space, click | opens the flag menu once; ring visible; click unchanged | Pending | Pending | |
| UR-3 | User rules unsaved-changes modal | edits made, Cmd+W | Tab through the dialog; close via the cross | close icon, Save and close and Discard changes each ring; the trap wraps; closing via the cross returns focus to the editor element that was focused at open, not the body | Pending | Pending | |
| UR-4 | User rules Save button | Save | Tab to Save, Enter/Space | saves once and the button shows the ring | Pending | Pending | |

## Focus Lifecycle And Edge Cases

Global rows:

| ID | Where | Control / state | Action | Expected | Light | Dark | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GEN-1 | All four modules | mouse-only interaction | click every control and move the pointer away | no ring is left anywhere and no new ring appears at the click target | Pending | Pending | |
| GEN-2 | All four modules | exactly one indicator | focus anywhere in a window, then Tab between controls | exactly one element shows the ring and none is left without a visible focus location | Pending | Pending | |

Edge cases:

| ID | Where | Control / state | Action | Expected | Light | Dark | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EDGE-1 | All modules | disabled controls | Tab past a disabled checkbox, switch, radio, button, `SettingsItemLink` row or pagination item | skipped by Tab, never activates, does not change state and stays reachable to VoiceOver; Space never scrolls | Pending | Pending | |
| EDGE-2 | All modules | hidden/closed overlay contents | with the dropdown/`Select` closed and the context menu unmounted, Tab through the section and past the trigger | none of the closed options or unmounted actions receives focus; `aria-hidden` decorations contain no focusable descendants; removed cards are not stops | Pending | Pending | Inventory of `aria-hidden` decorations. |
| EDGE-3 | All modules | modal trap | Tab and Shift+Tab at both ends of a dialog; open the loader modal (no focusable controls); stack a nested dialog | wraps at both ends; focus never escapes to the page behind; the loader dialog raises no error and keeps focus parked; nested dialogs keep focus in the outer dialog when the inner one closes | Pending | Pending | |
| EDGE-4 | All modules | overlay restore on Escape | open a dropdown/`Select`/context menu from keyboard and from pointer, then press Escape | closes and focus returns to the trigger; keyboard-opened surfaces show the trigger ring, pointer-opened ones stay ring-less (`:focus-visible` scoping) | Pending | Pending | |
| EDGE-5 | All modules | overlay restore on outside click | close with an outside click on a focusable target, on a non-focusable area, and with a right-click/Control-click; navigate away with an overlay open | a focusable click target keeps focus; clicking a non-focusable area returns focus to the trigger; right-click/Control-click outside also returns to the trigger; navigating away raises no error and steals no focus | Pending | Pending | |
| EDGE-6 | All modules | dropdown Tab-out | Tab on the last open option; Shift+Tab on the first | Tab closes the list, focus continues to the next control in document order and no value changes; Shift+Tab on the first option closes to the header | Pending | Pending | |
| EDGE-7 | All modules | opener-removed fallback | open a modal from the header context menu; remove an overlay trigger while the overlay is open; close the surface | the header-menu-opened modal falls back to the Settings page heading; the overlay falls back to the nearest visible target, never the body; after the fallback the page never has zero visible focus | Pending | Pending | |
| EDGE-8 | All modules | modality fallback, native path (current macOS) | Tab, then click, then inspect the fallback rule in Web Inspector | Tab shows the ring, a click removes it, and the fallback rule does not match | Pending | Pending | |
| EDGE-9 | All modules | modality fallback, forced path | temporarily invert `@supports not selector(:focus-visible)` to `@supports selector(:focus-visible)` in `common/theme/default/focusFallback.css`, run `bin/yarn build:dev` and `yarn syncUI`, then Tab, click and Tab again in all four modules; revert the edit and rebuild | Tab draws the ring, a click removes it with no stale ring, Tab again draws it, and text inputs and the `Select` stay border-only; the temporary inversion must never be committed | Pending | Pending | |
| EDGE-10 | All modules | modality fallback, old WebKit (macOS 12.0–12.2, machine or VM, when available) | repeat `EDGE-9`'s checks without the inversion | same show/hide rules as the native mechanism — this is the authoritative check | Pending | Pending | |

## Success Criteria Coverage

| Criterion | What it requires | Matrix rows | Automated/static evidence |
| --- | --- | --- | --- |
| SC-001 | All tab stops show a visible ring, 4 modules × 2 themes; 0 silent suppressions | module tables + `GEN-2` | lint rules; compiled-CSS check of the `focus-ring` mixin output |
| SC-002 | All custom controls activate with Enter/Space; 0 double/disabled activations | module activation rows + `EDGE-1` | `keyboardActivation` unit tests |
| SC-003 | Dialogs/overlays restore focus to opener; fallback when gone; 0 body | `EDGE-3`–`EDGE-7`, `SET-12`, `TRAY-8`, `UR-3` | `resolveFocusRestoreTarget` unit tests |
| SC-004 | Full Tab cycle per module without stalling or landing on non-operable elements | module cycle rows (`SET-18`, `TRAY-1`, `TRAY-5`, `TRAY-6`, `ONB-1`, `ONB-5`, `ONB-6`, `UR-1`) | source census of `tabIndex`/`role` per module |
| SC-005 | 0 rings after mouse-only interaction; 100% keyboard rings incl. macOS 12 WebKit | `GEN-1`, `EDGE-8`–`EDGE-10` | modality unit tests; `focusFallback.css` compiled check |
| SC-006 | Lint + tests + CI green | — (CI) | `bin/yarn lint --quiet`, `bin/yarn test:node`; `ts-lint`/`ts-test` lanes in `.github/workflows/pr-check.yml` |
| SC-007 | No regressions: select keyboard handling, tray story arrows, modal trap, heading announcements | module regression rows + `EDGE-3`, `TRAY-7` | existing unit tests |

Runtime confirmation of SC-001–SC-005 and SC-007 is pending the human
pass; SC-006 is confirmed by CI.

## Known Limits And Decisions

- The tray panel does not steal focus on open: every open runs
  `makeKeyAndOrderFront` plus `makeFirstResponder(webView)`, and
  `tabFocusesLinks` is `true`, so Tab reaches the panel controls. Runtime
  confirmation is row `TRAY-9`; a failure there is a Swift host follow-up.
- Native chrome (the status-bar item, native menus) does not participate in
  the WebView Tab cycle and stays out of scope; it follows Full Keyboard
  Access only.
- Decisions reflected in the rows: ring color `#7884CB`; disabled controls
  leave the tab order (`tabIndex={-1}`); text-entry controls keep the
  border-only focus treatment; `--focus-ring-color` is hand-authored in
  `variables.css`.

## Maintenance

- Update the affected rows when a module gains or removes a control class
  or when an offset preset changes; keep row IDs stable once an execution
  log references them.
- Run the full matrix before every release candidate; record the run in the
  execution log and keep the previous run's results if needed.
- A failing row is fixed or filed with module, control, expected and actual
  values; never mark a row `Pass` unobserved.
- The matrix is the manual half of the keyboard QA kit; the automated half
  is the lint/test/build roll-up listed under Static Pre-Checks.
