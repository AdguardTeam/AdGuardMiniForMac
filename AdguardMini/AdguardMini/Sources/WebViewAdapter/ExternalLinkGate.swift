// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ExternalLinkGate.swift
//  AdguardMini
//

import Foundation
import AML

/// Validates external links before opening them.
final class ExternalLinkGate {
    private let linkOpener: LinkOpening

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
            // Tokens, PII); log only the payload type so the raw value never
            // Lands in the exported diagnostics.
            LogError(
                "External link rejected: body is not a string, got type \(String(describing: type(of: candidate)))"
            )
            return
        }
        // Reject malformed URL values.
        guard let url = URL(string: string) else {
            LogError("External link rejected: unparseable value")
            return
        }
        guard let scheme = url.scheme?.lowercased(),
              Constants.permittedSchemes.contains(scheme) else {
            // Log only the scheme; the full URL may embed tokens or PII.
            LogError("External link rejected: disallowed scheme \(url.scheme ?? "nil")")
            return
        }
        // Http/https must carry a non-empty host (mailto legitimately has
        // None); an empty-host URL like "http://" would open an ambiguous
        // Destination in the browser.
        guard scheme == "mailto" || !(url.host?.isEmpty ?? true) else {
            LogError("External link rejected: URL without a host")
            return
        }
        linkOpener.openURL(url)
    }
}
