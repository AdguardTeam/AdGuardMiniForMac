<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# Discrepancy → Source Area Map

Hints for locating the TypeScript/Preact source once `ui_diff_check` reports a
discrepancy on a tray or settings screen. The module roots are under
`AdguardMini/ui/modules/`; shared code under `modules/common/`.

These are starting points, not exhaustive — always confirm by reading the
actual component. Use the `Explorer` subagent (read-only) or `grep_search`.

## Tray module (`modules/tray/`)

| Symptom | Likely area |
|---------|-------------|
| Status header (pause toggle, status text, icon) | `tray/` header component + status store |
| Filter/stats cards (blocked count, per-tab stats) | `tray/components/` health/status cards, `common/` stats store |
| Footer actions (open settings, quit) | `tray/` footer component |
| Colors / theme tokens | `modules/common/` theme + design tokens; regenerate with `yarn theme:generate` if tokens changed |
| Global spacing / typography | shared layout wrapper, theme tokens |
| Localized text wrong/missing | `modules/common/intl/locales/` JSON (+ Swift `.strings` for native chrome) |

## Settings module (`modules/settings/`)

| Symptom | Likely area |
|---------|-------------|
| Tab navigation / section list | `settings/` tab/section components |
| Filter lists (enable toggles, per-group) | `settings/` filters components + filter store |
| User rules editor | `modules/userrules/` (opened as child window) + `@adguard/rules-editor` |
| Licensing / About / other settings sections | `settings/` section components |
| Toggle/list styling tokens | `modules/common/` theme tokens, `AGSEDesignSystem` equivalents if ported |
| Native chrome (window title, toolbar) | Swift: `AdguardMini/Sources/UI/` and `PopupExtension/AGSEDesignSystem/` |

## Cross-cutting

- **Design tokens / theme:** run `yarn theme:generate` after editing design token
  sources so generated stylesheets stay in sync.
- **Protobuf-backed data:** if a value is summarised from the platform layer,
  check the schema in `AdguardMini/ui/schema/` and the generated Swift
  in `AdguardMini/MiniResources/SciterSchema/Sources/`.
- **Globally injected imports** (do NOT report as missing): webpack
  `ProvidePlugin` entries in `scripts/webpack/webpack.config.base.js`.
- **Custom TS types:** check `AdguardMini/ui/@types` before trusting
  inferred types.

## When you can't pinpoint the source

1. Grep for a visible, static label string (search the locale JSON for the
   translation key, then grep the key in TSX).
2. Inspect the live WebView with the Web Inspector (Develop menu) to read the
   rendered DOM class names, then grep those classes in the module.
3. If still stuck, call `get_metadata` on the Figma node to read child node
   names, then `get_design_context` on the child to get reference code that
   names the component.
