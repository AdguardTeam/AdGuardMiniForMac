#!/usr/bin/env python3
# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""
Capture screenshots of the running AdGuard Mini macOS app's WKWebView modules
(tray popover and settings window) by their CoreGraphics window id.

This is a developer-inspection tool. It does NOT need a dev server: it attaches
to the already-running app (typically the DEBUG build launched from Xcode) and
grabs the live WebView window. Because the tray is a non-key status-bar panel,
synthetic mouse events do not drive it, so this tool only screenshots (and can
open modules via native status-item / menu actions).

Subcommands
-----------
  list                 List every AdGuard Mini CoreGraphics window with its id,
                      title, geometry, and a guessed module (tray/settings).
  capture MODULE OUT   Capture MODULE ("tray" or "settings") to PNG file OUT.
                      MODULE defaults to "tray"; OUT defaults to
                      ".screenShotsReview/<module>.png" (created if missing).
  open MODULE         Open MODULE via native UI (status-item click for tray,
                      Preferences menu for settings). Best-effort.

Window selection
----------------
  tray     : smallest AdGuard Mini window with height >= 100 px (the 360x582
             status popover; excludes 30px menu strips and other large windows).
  settings : AdGuard Mini window whose title is "AdGuard Mini" and width >= 600
             px (the top-level settings NSWindow).

Requirements: macOS, Python 3 standard library only, and the
"Screen Recording" (for screencapture) and "Accessibility" (for opening via
System Events) privacy permissions granted.
"""

import argparse
import ctypes
import ctypes.util
import json
import os
import subprocess
import sys

# ---------------------------------------------------------------------------
# CoreGraphics / CoreFoundation bindings (standard library only)
# ---------------------------------------------------------------------------

CF = ctypes.CDLL(ctypes.util.find_library("CoreFoundation"))
CG = ctypes.CDLL(ctypes.util.find_library("CoreGraphics"))

CG.CGWindowListCopyWindowInfo.restype = ctypes.c_void_p
CG.CGWindowListCopyWindowInfo.argtypes = [ctypes.c_uint32, ctypes.c_uint32]
CF.CFArrayGetCount.restype = ctypes.c_long
CF.CFArrayGetCount.argtypes = [ctypes.c_void_p]
CF.CFArrayGetValueAtIndex.restype = ctypes.c_void_p
CF.CFArrayGetValueAtIndex.argtypes = [ctypes.c_void_p, ctypes.c_long]
CF.CFDictionaryGetValue.restype = ctypes.c_void_p
CF.CFDictionaryGetValue.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
CF.CFStringCreateWithCString.restype = ctypes.c_void_p
CF.CFStringCreateWithCString.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
CF.CFStringGetLength.restype = ctypes.c_long
CF.CFStringGetLength.argtypes = [ctypes.c_void_p]
CF.CFStringGetCString.restype = ctypes.c_int
CF.CFStringGetCString.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_long, ctypes.c_uint32]
CF.CFNumberGetValue.restype = ctypes.c_int
CF.CFNumberGetValue.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p]
CF.CFRelease.argtypes = [ctypes.c_void_p]

ENC = 0x08000100  # kCFStringEncodingUTF8


def _cfstr(p):
    if not p:
        return None
    n = CF.CFStringGetLength(p)
    buf = ctypes.create_string_buffer(n * 4 + 1)
    CF.CFStringGetCString(p, buf, n * 4 + 1, ENC)
    return buf.value.decode("utf-8", "replace")


def _cfnum(p):
    if not p:
        return None
    v = ctypes.c_int64(0)
    CF.CFNumberGetValue(p, 4, ctypes.byref(v))  # kCFNumberSInt64Type
    return v.value


def _key(s):
    return CF.CFStringCreateWithCString(None, s.encode("utf-8"), ENC)


def _owner_name(d):
    return _cfstr(CF.CFDictionaryGetValue(d, _key("kCGWindowOwnerName")))


def _window_id(d):
    return _cfnum(CF.CFDictionaryGetValue(d, _key("kCGWindowNumber")))


def _window_name(d):
    return _cfstr(CF.CFDictionaryGetValue(d, _key("kCGWindowName")))


def _bounds(d):
    b = CF.CFDictionaryGetValue(d, _key("kCGWindowBounds"))
    if not b:
        return None
    get = lambda k: _cfnum(CF.CFDictionaryGetValue(b, _key(k)))
    return {
        "x": get("X"),
        "y": get("Y"),
        "w": get("Width"),
        "h": get("Height"),
    }


def list_windows():
    """Return a list of dicts for every AdGuard Mini CoreGraphics window."""
    arr = CG.CGWindowListCopyWindowInfo(0, 0)  # kCGWindowListOptionAll
    if not arr:
        return []
    cnt = CF.CFArrayGetCount(arr)
    out = []
    for i in range(cnt):
        d = CF.CFArrayGetValueAtIndex(arr, i)
        if not d:
            continue
        if _owner_name(d) != "AdGuard Mini":
            continue
        b = _bounds(d)
        if not b:
            continue
        out.append({
            "id": _window_id(d),
            "name": _window_name(d) or "",
            "x": b["x"],
            "y": b["y"],
            "w": b["w"],
            "h": b["h"],
            "area": (b["w"] or 0) * (b["h"] or 0),
        })
    return out


# ---------------------------------------------------------------------------
# Module window resolution
# ---------------------------------------------------------------------------

def find_window(module):
    """Return the CoreGraphics window dict for the given module, or None."""
    windows = list_windows()
    if module == "tray":
        # Smallest window with a usable height (excludes 30px menu strips).
        candidates = [w for w in windows if (w["h"] or 0) >= 100]
        if not candidates:
            return None
        return min(candidates, key=lambda w: w["area"])
    if module == "settings":
        # Top-level settings NSWindow: titled "AdGuard Mini", reasonably large.
        candidates = [
            w for w in windows
            if w["name"] == "AdGuard Mini" and (w["w"] or 0) >= 600 and (w["h"] or 0) >= 500
        ]
        if not candidates:
            return None
        return max(candidates, key=lambda w: w["area"])
    raise ValueError("unknown module: %s" % module)


def guess_module(w):
    """Best-effort module label for `list` output."""
    if w["name"] == "AdGuard Mini" and (w["w"] or 0) >= 600:
        return "settings"
    if (w["h"] or 0) >= 100 and w["area"] < 500 * 500:
        return "tray?"
    return ""


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------

def capture(module, out_path):
    win = find_window(module)
    if not win:
        sys.stderr.write(
            "No open '%s' window found. Open it first (try: %s open %s).\n"
            % (module, sys.argv[0], module)
        )
        return 1
    # Ensure the destination directory exists (e.g. .screenShotsReview/).
    parent = os.path.dirname(out_path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    res = subprocess.run(["screencapture", "-l", str(win["id"]), "-o", out_path])
    if res.returncode != 0:
        sys.stderr.write("screencapture failed (rc=%s)\n" % res.returncode)
        return res.returncode
    print("captured %s (window %s) -> %s" % (module, win["id"], out_path))
    return 0


def open_module(module):
    if module == "tray":
        # Click the status-bar item (menu bar 2, item 1) — a native AX element.
        res = subprocess.run([
            "osascript", "-e",
            'tell application "System Events" to click (menu bar item 1 of menu bar 2 of process "AdGuard Mini")'
        ], capture_output=True, text=True)
        if res.returncode != 0:
            sys.stderr.write("Failed to open tray: %s\n" % res.stderr.strip())
            return res.returncode
        print("opened tray")
        return 0
    if module == "settings":
        # The Preferences menu item (AppMenu.preferencesHandler) is bound to
        # Cmd+, in the app's main menu. Activate the app and send it.
        # Activate via System Events so the main menu key equivalent works.
        res = subprocess.run([
            "osascript", "-e",
            'tell application "System Events" to set frontmost of process "AdGuard Mini" to true'
        ], capture_output=True, text=True)
        if res.returncode != 0:
            sys.stderr.write("Failed to activate AdGuard Mini: %s\n" % res.stderr.strip())
            return res.returncode
        # Post Cmd+, through a short AppleScript keystroke.
        res = subprocess.run([
            "osascript", "-e",
            'tell application "System Events" to keystroke "," using command down'
        ], capture_output=True, text=True)
        if res.returncode != 0:
            sys.stderr.write("Failed to open settings: %s\n" % res.stderr.strip())
            return res.returncode
        print("requested settings open (Cmd+,); if nothing appeared, open it "
              "manually from the tray gear or status-item context menu")
        return 0
    raise ValueError("unknown module: %s" % module)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Capture/screenshot AdGuard Mini tray & settings WebViews.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="list AdGuard Mini windows")

    p_cap = sub.add_parser("capture", help="capture a module to a PNG")
    p_cap.add_argument("module", choices=["tray", "settings"], nargs="?", default="tray")
    p_cap.add_argument("out", nargs="?", default=None, help="output PNG path")

    p_open = sub.add_parser("open", help="open a module via native UI")
    p_open.add_argument("module", choices=["tray", "settings"])

    args = parser.parse_args()

    if args.cmd == "list":
        wins = list_windows()
        if not wins:
            print("no AdGuard Mini windows found")
            return 0
        for w in wins:
            print("id=%-6s mod=%-8s name=%-12r %sx%s @ (%s,%s)" % (
                w["id"], guess_module(w), w["name"], w["w"], w["h"], w["x"], w["y"]))
        return 0

    if args.cmd == "capture":
        out = args.out or (".screenShotsReview/%s.png" % args.module)
        return capture(args.module, out)

    if args.cmd == "open":
        return open_module(args.module)

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
