// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  DiagnosticsWindow.swift
//  AdguardMini
//

import AppKit
import Foundation
import NetworkExtension
import SwiftUI

// MARK: - DiagnosticsWindowPresenter

/// Presents the hidden diagnostics window.
///
/// Deliberately kept out of the app lifecycle: the window is retained for the
/// process lifetime and shown on demand.
@MainActor
final class DiagnosticsWindowPresenter {
    /// The presented window, if it has been created before.
    private static var window: NSWindow?

    /// Shows the diagnostics window, creating it on first use.
    /// - Parameter support: Provides the app state text.
    static func present(support: Support) {
        if let window = Self.window {
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }
        let view = DiagnosticsView(support: support)
        let window = NSWindow(contentViewController: NSHostingController(rootView: view))
        window.title = "Diagnostics"
        window.setContentSize(NSSize(width: Constants.windowWidth, height: Constants.windowHeight))
        window.center()
        window.isReleasedWhenClosed = false
        Self.window = window
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private enum Constants {
        static let windowWidth: CGFloat = 700
        static let windowHeight: CGFloat = 600
    }
}

// MARK: - DiagnosticsView

/// Content of the hidden diagnostics window.
@MainActor
private struct DiagnosticsView: View {
    let support: Support

    @State private var stateText = ""
    @State private var stateError = ""
    @State private var url = ""
    @State private var verdictText = ""
    @State private var isStateLoading = false
    @State private var isVerdictLoading = false

    var body: some View {
        VStack(alignment: .leading, spacing: Constants.spacing) {
            Text("App state").font(.headline)
            ScrollView {
                Text(self.stateText)
                    .font(.system(.body, design: .monospaced))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
            }
            .frame(maxHeight: .infinity)
            if !self.stateError.isEmpty {
                Text("Error: \(self.stateError)").foregroundColor(.red)
            }
            HStack {
                Button("Refresh") {
                    Task { await self.loadState() }
                }
                .disabled(self.isStateLoading)
                Spacer()
            }

            Divider()

            Text("System Wide Protection verdict").font(.headline)
            TextField("Enter a URL", text: self.$url)
                .onSubmit {
                    Task { await self.getVerdict() }
                }
            HStack {
                Button("Get verdict") {
                    Task { await self.getVerdict() }
                }
                .disabled(self.isVerdictLoading)
                Spacer()
            }
            Text(self.verdictText)
        }
        .padding(Constants.padding)
        .frame(minWidth: Constants.minWidth, minHeight: Constants.minHeight)
        .task {
            await self.loadState()
        }
    }

    /// Loads the current state text.
    private func loadState() async {
        guard !self.isStateLoading else { return }
        self.isStateLoading = true
        self.stateError = ""
        defer { self.isStateLoading = false }
        self.stateText = await self.support.getState()
    }

    /// Evaluates the entered URL with the local URL filter.
    private func getVerdict() async {
        guard !self.isVerdictLoading else { return }
        self.isVerdictLoading = true
        defer { self.isVerdictLoading = false }
        let trimmedURL = self.url.trimmingCharacters(in: .whitespacesAndNewlines)
        let inputURL = URL(string: trimmedURL)
        let normalizedURL: String
        normalizedURL = if let scheme = inputURL?.scheme, !scheme.isEmpty {
            trimmedURL
        } else {
            "https://\(trimmedURL)"
        }
        guard let url = URL(string: normalizedURL),
              let scheme = url.scheme?.lowercased(),
              scheme == "http" || scheme == "https",
              url.host != nil else {
            self.verdictText = "Error: invalid URL"
            return
        }
        guard #available(macOS 26, *) else {
            self.verdictText = "Error: URL filter is unavailable on this macOS version"
            return
        }

        let verdict = await NEURLFilter.verdict(for: url)
        switch verdict {
        case .deny:
            self.verdictText = "Blocked"
        case .allow:
            self.verdictText = "Allowed"
        case .unknown:
            self.verdictText = "Error: unknown verdict"
        @unknown default:
            self.verdictText = "Error: unknown verdict"
        }
    }

    private enum Constants {
        static let spacing: CGFloat = 8
        static let padding: CGFloat = 16
        static let minWidth: CGFloat = 640
        static let minHeight: CGFloat = 480
    }
}
