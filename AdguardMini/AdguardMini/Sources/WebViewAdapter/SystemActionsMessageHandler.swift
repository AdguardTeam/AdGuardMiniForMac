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

/// Test seam for `NSPasteboard.general` reads.
protocol PasteboardReading: AnyObject {
    /// Returns the current string content, or `nil` if the pasteboard has none.
    func readString() -> String?
}

// MARK: - SystemActionsMessageHandler

/// Handles open-link and clipboard actions.
///
/// Clipboard writes (`systemClipboard`) and reads (`systemClipboardRead`)
/// route through the Swift `NSPasteboard`, because the WebKit async clipboard
/// API (`navigator.clipboard`) is not granted to `WKWebView` pages — a
/// `readText()` there rejects with a `NotAllowedError`, which is exactly why
/// the editor's Cmd+V failed.
final class SystemActionsMessageHandler: NSObject, WKScriptMessageHandler {
    private enum Constants {
        /// Max clipboard payload (1 MiB).
        static let maxClipboardPayloadBytes = 1_048_576
        /// Clipboard rate limiter config.
        static let clipboardCapacity = 2.0
        static let clipboardRefillPerSecond = 2.0
    }

    /// Fixed instruction body; runtime values travel only in `arguments`.
    private enum InstructionBodies {
        static let resolveClipboardReadBody = "window.__resolveSystemClipboardRead(id, text)"
    }

    private let externalLinkGate: ExternalLinkGate
    private let pasteboard: PasteboardWriting
    private let pasteboardReader: PasteboardReading
    /// Host web view used to deliver `systemClipboardRead` replies back to JS.
    /// Absent only in unit tests that construct the handler without a host.
    private let webViewEvaluator: (any WebViewAsyncInvoking)?
    private let clipboardLimiter: TokenBucketLimiter
    // Logs unknown names and bad body types.
    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "SystemActionsMessageHandler"
    )

    init(
        externalLinkGate: ExternalLinkGate,
        pasteboard: PasteboardWriting,
        pasteboardReader: PasteboardReading,
        webViewEvaluator: (any WebViewAsyncInvoking)? = nil,
        clipboardLimiter: TokenBucketLimiter? = nil
    ) {
        self.externalLinkGate = externalLinkGate
        self.pasteboard = pasteboard
        self.pasteboardReader = pasteboardReader
        self.webViewEvaluator = webViewEvaluator
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
            pasteboard: NSPasteboardWriter(),
            pasteboardReader: NSPasteboardReader()
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
            self.handleClipboardWrite(message: message)
        case "systemClipboardRead":
            self.handleClipboardRead(message: message)
        default:
            logger.debug("Unknown WKScriptMessage name: \(message.name, privacy: .public)")
            return
        }
    }

    private func handleClipboardWrite(message: ScriptMessageHandling) {
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
    }

    private func handleClipboardRead(message: ScriptMessageHandling) {
        // Reads are rate-limited like the write path: any script in the page
        // Could otherwise drain the system pasteboard silently, without a
        // User gesture, at an unbounded rate.
        guard let evaluator = self.webViewEvaluator else {
            logger.error("systemClipboardRead: no web view evaluator configured")
            return
        }
        guard let id = Self.coerceReadId(message.body) else {
            logger.error("systemClipboardRead: bad body, got \(String(describing: type(of: message.body)), privacy: .public)")
            return
        }
        switch self.clipboardLimiter.tryConsume() {
        case .allowed:
            break
        case .limited(let shouldLog):
            // A dropped read gets no reply; the JS side resolves empty after
            // Its own timeout, so a paste simply inserts nothing.
            if shouldLog {
                logger.error("systemClipboardRead: read rate limited — dropping")
            }
            return
        }
        // The reply must reach the page that asked: deliver the pasteboard
        // Content back into this host's own JS context. A pasteboard without
        // String content reads as empty, so the editor pastes nothing instead
        // Of hanging on a missing reply.
        let text = self.pasteboardReader.readString() ?? ""
        evaluator.invoke(
            body: InstructionBodies.resolveClipboardReadBody,
            arguments: ["id": id, "text": text]
        ) { [weak self] result in
            if case .failure(let error) = result {
                self?.logger.error("systemClipboardRead: reply failed \(error)")
            }
        }
    }

    /// Coerces the `systemClipboardRead` correlation id from an `{ id: n }`
    /// body, rejecting fractional values so the reply cannot be correlated to
    /// the wrong pending read.
    private static func coerceReadId(_ value: Any?) -> Int? {
        guard let dict = value as? [String: Any] else { return nil }
        switch dict["id"] {
        case let intValue as Int:
            return intValue
        case let number as NSNumber:
            let doubleValue = number.doubleValue
            guard doubleValue.rounded() == doubleValue else { return nil }
            return Int(doubleValue)
        default:
            return nil
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

final class NSPasteboardReader: PasteboardReading {
    func readString() -> String? {
        NSPasteboard.general.string(forType: .string)
    }
}
