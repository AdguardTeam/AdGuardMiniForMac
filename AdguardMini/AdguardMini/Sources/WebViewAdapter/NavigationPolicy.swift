// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  NavigationPolicy.swift
//  AdguardMini
//

import Foundation
import WebKit
import os

/// Decides navigation policy and handles cancelled links.
final class NavigationPolicy {
    /// Module entry URL.
    private let entryURL: URL

    /// External link gate.
    private let externalLinkGate: ExternalLinkGate

    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "NavigationPolicy"
    )

    private enum Constants {
        /// Web schemes handled by gate.
        static let webSchemes: Set<String> = ["http", "https"]
    }

    /// Creates navigation policy.
    init(entryURL: URL, externalLinkGate: ExternalLinkGate) {
        self.entryURL = entryURL
        self.externalLinkGate = externalLinkGate
    }

    /// Returns allow for entry URL, cancel otherwise.
    func decidePolicy(forNavigationTo destination: URL?) -> WKNavigationActionPolicy {
        // Compare normalized file URLs: WKWebView may report the entry URL
        // Percent-encoded, symlink-resolved (e.g. `/tmp` → `/private/tmp`),
        // Or dot-segment-collapsed, so an exact-string match would wrongly
        // Cancel the module's own entry page (blank window, no error).
        if destination?.standardizedFileURL == entryURL.standardizedFileURL {
            return .allow
        }
        // Non-entry navigations are cancelled and optionally handed off.
        handoffCancelled(destination: destination)
        return .cancel
    }

    /// Routes cancelled navigation.
    private func handoffCancelled(destination: URL?) {
        guard let url = destination else {
            logger.error("Navigation cancelled: nil destination")
            return
        }
        let scheme = url.scheme?.lowercased()
        if let scheme, Constants.webSchemes.contains(scheme) {
            externalLinkGate.open(candidate: url.absoluteString)
        } else {
            // Non-web destinations can embed local file paths or other
            // Sensitive data; keep them private-redacted in the log.
            logger.error(
                "Navigation cancelled: non-web destination \(url.absoluteString, privacy: .private)"
            )
        }
    }
}
