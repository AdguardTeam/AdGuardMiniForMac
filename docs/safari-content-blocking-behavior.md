<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# Safari Content Blocking: How Blocking Statistics Work

This document describes the observed behavior of Safari's Content Blocker API
as it relates to blocking statistics in AdGuard Mini. It is meant as a
reference for anyone working on the statistics pipeline — whether fixing bugs,
designing new counting algorithms, or reasoning about edge cases.

---

## 1. Safari's Callback API

Safari notifies the popup extension about blocked resources via:

```swift
SFSafariExtensionHandler.contentBlocker(
    withIdentifier: String,           // which content blocker fired
    blockedResourcesWith urls: [URL], // blocked URLs
    on page: SFSafariPage             // the page (Hashable)
)
```

Key properties:

- Called **once per content blocker** that blocked a resource. If a URL matches
  rules in multiple content blockers, the callback fires once for each blocker.
- There is **no correlation ID** linking callbacks that belong to the same
  underlying network request.
- In practice, `urls.count == 1` for every observed callback.
- `SFSafariPage` conforms to `Hashable` and can be used as a dictionary key.
- `page`, `urls`, and `contentBlockerIdentifier` are available **only** inside
  this callback. The current implementation discards `page` and `urls` before
  transmitting statistics via XPC, so the main app never sees them.

---

## 2. The Six Content Blockers

AdGuard Mini has 6 content blocker extensions. Each runs in a separate process
and has its own set of compiled rules (JSON).

| Log name | Bundle ID suffix | `SafariBlockerType` |
|----------|-----------------|---------------------|
| `BlockerCustom` | `BlockerCustom` | `.custom` |
| `BlockerExtension` | `BlockerExtension` | **`.general`** |
| `BlockerOther` | `BlockerOther` | `.other` |
| `BlockerPrivacy` | `BlockerPrivacy` | `.privacy` |
| `BlockerSecurity` | `BlockerSecurity` | `.security` |
| `BlockerSocial` | `BlockerSocial` | `.socialWidgetsAndAnnoyances` |

Note: `AG_BLOCKER_GENERAL_BUNDLEID` has the legacy suffix `BlockerExtension`,
which maps to `.general` (ad blocking, language-specific filters).

The `.advanced` case in `SafariBlockerType` is not a content blocker — it
corresponds to the popup extension (`AG_POPUP_EXTENSION_BUNDLEID` =
`"...Extension"`). It never appears as `contentBlockerIdentifier` in the
callback.

All 6 content blockers are recognized by
`SafariBlockerType.init?(contentBlockerIdentifier:)` and participate in
statistics.

---

## 3. Observed Callback Patterns

### 3.1 Cross-blocker duplication — one request, multiple blockers

When a single network request matches rules in multiple content blockers,
Safari fires the callback once per blocker. Example: one request to
`example.com/analytics/event` generates 6 callbacks (one from each blocker).

This happens because the same rule (especially user rules) can be present
in multiple content blockers — see Section 5 for why.

**Maximum inflation factor: 6×** (one real request counted six times if
naively summed).

### 3.2 Repeated requests — one blocker, many calls

When the same URL is requested multiple times (e.g., analytics retries,
Beacon API), the same blocker fires once per request. Example:
`example.com/analytics/collect` blocked 10 times by Privacy blocker = 10
distinct network requests. All 10 are legitimate blocks.

### 3.3 Combined — cross-blocker and repeated requests together

Both phenomena can occur simultaneously on the same page:

| URL | Blockers per request | Network requests | Naive sum | Actual blocks |
|-----|---------------------|------------------|-----------|---------------|
| `example.com/favicon.png` | 6 | 1 | 6 | **1** |
| `example.com/favicon.svg` | 6 | 1 | 6 | **1** |
| `example.com/messaging/data.json` | 5 | 1 | 5 | **1** |
| `analytics.example.com/collect` | 5 | ~30 | ~150 | **~30** |
| `api.example.com/stats` | 1 | 2 | 2 | **2** |
| **Total** | | | **~169** | **~35** |

### 3.4 Cross-blocker callbacks arrive as a burst

The callbacks for a single network request from different content blockers
arrive within ~100μs of each other. They are not interleaved with callbacks
from other requests.

### 3.5 `SFSafariPage.hash` is stable across reloads

The same `page.hash` value was observed before and after a page reload.
This means `SFSafariPage.hash` does **not** change on reload and cannot be
used to detect page navigation boundaries.

### 3.6 Same-tab navigation preserves page hash

When navigating from site A to site B in the same tab, `page.hash` stays
the same but the blocked URLs change. Old URLs from site A will not appear
in new callbacks (different URL keys).

### 3.7 Different tabs have different page hashes

Different tabs report concurrently with different `page.hash` values. Each
tab's statistics are independent.

### 3.8 No navigation hooks in the extension

The extension does not implement `page(_:willNavigateTo:)`. There is no way
to detect reloads or navigations from inside the popup extension handler.

---

## 4. Callback Granularity: One Per Blocker, Not Per Rule

A content blocker fires **at most once** per network request, regardless of
how many rules in that blocker's JSON matched the request.

### Rule deduplication in the build pipeline

The only text-level deduplication is `OrderedSet<String>` in
`RulesGrouperImpl` (GroupRules.swift), applied per line of text within each
content blocker before passing rules to `SafariConverterLib`.

`SafariConverterLib` does not deduplicate — neither input rule texts nor
compiled `BlockerEntry` objects.

### Duplicate entries in one blocker's JSON

Can happen when:
1. **Case-different variants** — `||ADS.COM^` and `||ads.com^` are distinct
   strings in the `OrderedSet`, but both compile to the same `url-filter`.
2. **User rule duplicating a filter-list rule** with minor syntax variation.

### Safari handles duplicates at runtime

Safari compiles `url-filter` regexes into a DFA. Identical patterns merge
into the same DFA states — the matching engine processes them once. Duplicate
entries are harmless at runtime (they only waste rule-limit slots).

**Key fact**: even with duplicate entries in a blocker's JSON, the callback
fires once per blocker per request, not once per matching entry.
