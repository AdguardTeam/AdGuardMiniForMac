<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# `ui_diff_check` Prompt Template

Pass this (adapted to the specific screen) as the `prompt` parameter of the
`ui_diff_check` tool. The goal is a **correct layout**, not a pixel-perfect
clone of the Figma render: elements must be in the right place, at the right
size, in the right color. The prompt asks the tool to report actionable,
per-element *layout* differences while ignoring non-meaningful rendering noise.

## Template

```
Compare the EXPECTED (Figma design) screenshot against the ACTUAL (running
app WebView) screenshot for the <MODULE> module, "<SCREEN NAME>".

Focus on LAYOUT CORRECTNESS — elements being in the right place, at the right
size, with the right colors — NOT on pixel-identical rendering.

Ignore:
- Minor anti-aliasing / font hinting differences.
- Slight sub-pixel rendering of text and icons.
- Placeholder vs. real dynamic text content length, as long as the layout
  container and truncation behavior match.
- Cursor / focus rings / hover states unless the design explicitly specifies
  a state being compared.
- Rendering-only differences that do not change the perceived layout (e.g.
  image rendering quality).

Flag precisely, for EACH element whose LAYOUT differs:
- Placement / position: element is missing, extra, or in the wrong place.
- Spacing: padding, margins, gaps between elements (too tight / too loose).
- Sizing: element width/height where it visibly differs from the design.
- Alignment: left/center/right, baseline alignment, vertical centering, and
  the ordering of elements.
- Color: backgrounds, borders, text color, icon tints, dividers, shadows —
  report colors that are clearly off from the design tokens.
- Typography: font size, weight, line height (report numeric guesses where
  possible); text color is covered under Color.

For each item give: the element, what the EXPECTED shows, what the ACTUAL
shows, and the likely CSS/layout cause if obvious.
End with an overall verdict: MATCH / MINOR_DIFFS / MAJOR_DIFFS, where MATCH
means the layout is correct (placement, sizes, colors) even if rendering
differs in non-structural ways.
```

## Usage notes

- Replace `<MODULE>` (`tray` | `settings`) and `<SCREEN NAME>` before sending.
- If a specific state is being verified (collapsed/expanded, selected,
  disabled), add a one-line "Expected state: …" directive so the tool focuses
  on that state's relevant cues.
- "Match" means the layout is correctly realized: right elements, right
  places, right sizes, right colors — not a bit-for-bit identical image.
- For sizing-sensitive screens, append: "Report numeric width/height and
  spacing guesses where the actual differs from the design."
- For color fidelity, append: "Report background/border/text/icon-tint
  differences even when subtle."
