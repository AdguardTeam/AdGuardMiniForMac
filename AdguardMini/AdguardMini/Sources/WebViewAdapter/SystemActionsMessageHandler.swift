// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SystemActionsMessageHandler.swift
//  AdguardMini
//

import Foundation
import AppKit
import WebKit
import os
import ProtoSchema // ScriptMessageHandling test seam (same module).

// MARK: - Test seams

/// Test seam for `NSWorkspace.shared.open`.
protocol LinkOpening: AnyObject {
    func openURL(_ url: URL)
}

/// Test seam for `NSPasteboard.general` writes.
protocol PasteboardWriting: AnyObject {
    func writeString(_ string: String)
}

// MARK: - SystemActionsMessageHandler

/// Handles open-link and clipboard actions.
final class SystemActionsMessageHandler: NSObject, WKScriptMessageHandler {
    private enum Constants {
        /// Max clipboard payload (1 MiB).
        static let maxClipboardPayloadBytes = 1_048_576
        /// Clipboard rate limiter config.
        static let clipboardCapacity = 2.0
        static let clipboardRefillPerSecond = 2.0
    }

    private let externalLinkGate: ExternalLinkGate
    private let pasteboard: PasteboardWriting
    private let clipboardLimiter: TokenBucketLimiter
    // Logs unknown names and bad body types.
    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "SystemActionsMessageHandler"
    )

    init(
        externalLinkGate: ExternalLinkGate,
        pasteboard: PasteboardWriting,
        clipboardLimiter: TokenBucketLimiter? = nil
    ) {
        self.externalLinkGate = externalLinkGate
        self.pasteboard = pasteboard
        self.clipboardLimiter = clipboardLimiter ?? TokenBucketLimiter(
            capacity: Constants.clipboardCapacity,
            refillPerSecond: Constants.clipboardRefillPerSecond
        )
        super.init()
    }

    /// Production initializer.
    override convenience init() {
        self.init(
            externalLinkGate: ExternalLinkGate(linkOpener: NSWorkspaceLinkOpener()),
            pasteboard: NSPasteboardWriter()
        )
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        // Privileged actions (open link / write clipboard) must only be
        // Triggered by the module page itself, not by any subframe whose
        // Content is not under our control.
        guard message.frameInfo.isMainFrame else {
            logger.error("Ignoring system action from non-main frame: \(message.name, privacy: .public)")
            return
        }
        handle(message: message)
    }

    /// Handles message via test seam.
    func handle(message: ScriptMessageHandling) {
        switch message.name {
        case "openLinkInBrowser":
            externalLinkGate.open(candidate: message.body)
        case "systemClipboard":
            guard let string = message.body as? String else {
                // Log only the body's type, never its content (JS-provided
                // Data may carry sensitive information).
                logger.error(
                    "systemClipboard: bad body, got \(String(describing: type(of: message.body)), privacy: .public)"
                )
                return
            }
            guard string.utf8.count <= Constants.maxClipboardPayloadBytes else {
                logger.error(
                    "systemClipboard: payload too large (\(string.utf8.count) bytes) — rejected"
                )
                return
            }
            switch clipboardLimiter.tryConsume() {
            case .allowed:
                pasteboard.writeString(string)
            case .limited(let shouldLog):
                if shouldLog {
                    logger.error("systemClipboard: write rate limited — dropping")
                }
            }
        default:
            logger.debug("Unknown WKScriptMessage name: \(message.name, privacy: .public)")
            return
        }
    }
}

// MARK: - Production backends

final class NSWorkspaceLinkOpener: LinkOpening {
    func openURL(_ url: URL) {
        NSWorkspace.shared.open(url)
    }
}

final class NSPasteboardWriter: PasteboardWriting {
    func writeString(_ string: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(string, forType: .string)
    }
}
