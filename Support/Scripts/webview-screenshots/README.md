<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# WebView Screenshot Tool

Capture screenshots of the **running** AdGuard Mini macOS app's WKWebView
modules (tray popover and settings window) by their CoreGraphics window id.
No dev server required — it attaches to the live app (usually the DEBUG build
launched from Xcode).

By default captures are written to `.screenShotsReview/` in the project root
(this folder is gitignored); pass an explicit path to write elsewhere.

## Why not synthetic clicks?

The tray is a non-key status-bar `NSPanel`. Synthetic mouse events
(`CGEventPost`, System Events `click`) do **not** reach its WKWebView, so this
tool only screenshots and opens modules via native status-item / menu actions.
To drive the UI, use the Web Inspector (Develop menu) instead.

## Setup

Grant the following macOS privacy permissions (System Settings → Privacy &
Security):

- **Screen Recording** — so `screencapture` can read the window.
- **Accessibility** — so the script can open modules via System Events.

Python 3 standard library only; no packages to install.

## Usage

```bash
# List AdGuard Mini's CoreGraphics windows (id, title, geometry, guessed module)
./webview-screenshot list

# Capture the tray popover to .screenShotsReview/tray.png (default)
./webview-screenshot capture tray

# Capture the settings window to a specific path
./webview-screenshot capture settings ~/Desktop/settings.png

# Open a module via native UI (best-effort)
./webview-screenshot open tray
./webview-screenshot open settings
```

The Python implementation lives in `webview_screenshot.py`; `webview-screenshot`
is a thin `bash` wrapper. Both are executable.

## How window detection works

- **tray** — smallest AdGuard Mini window with height ≥ 100 px (the 360×582
  status popover; excludes 30 px menu strips and larger windows).
- **settings** — AdGuard Mini window titled `AdGuard Mini` with width ≥ 600 px.

Capture uses `screencapture -l <CGWindowID>` (coordinate-independent, robust to
multi-display / negative-Y layouts).
