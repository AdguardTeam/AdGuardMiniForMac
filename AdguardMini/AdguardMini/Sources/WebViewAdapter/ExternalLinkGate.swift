// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ExternalLinkGate.swift
//  AdguardMini
//

import Foundation
import os

/// Validates external links before opening them.
final class ExternalLinkGate {
    private let linkOpener: LinkOpening
    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "ExternalLinkGate"
    )

    private enum Constants {
        /// Allowed schemes.
        static let permittedSchemes: Set<String> = ["http", "https", "mailto"]
    }

    /// Creates a gate with injected opener.
    init(linkOpener: LinkOpening) {
        self.linkOpener = linkOpener
    }

    /// Opens a candidate link if valid.
    func open(candidate: Any?) {
        // Reject non-string payloads from script messages.
        guard let string = candidate as? String else {
            // Rejection payloads may embed sensitive data (activation codes,
            // Tokens, PII); keep them private-redacted in the unified log.
            logger.error(
                "External link rejected: body is not a string, got \(String(describing: candidate), privacy: .private)"
            )
            return
        }
        // Reject malformed URL values.
        guard let url = URL(string: string) else {
            logger.error(
                "External link rejected: unparseable value \(string, privacy: .private)"
            )
            return
        }
        guard let scheme = url.scheme?.lowercased(),
              Constants.permittedSchemes.contains(scheme) else {
            logger.error(
                "External link rejected: disallowed scheme in \(string, privacy: .private)"
            )
            return
        }
        // Http/https must carry a non-empty host (mailto legitimately has
        // None); an empty-host URL like "http://" would open an ambiguous
        // Destination in the browser.
        guard scheme == "mailto" || !(url.host?.isEmpty ?? true) else {
            logger.error(
                "External link rejected: no host in \(string, privacy: .private)"
            )
            return
        }
        linkOpener.openURL(url)
    }
}
