// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TerminationListener.swift
//  Watchdog
//

import AppKit

// MARK: - Constants

private enum Constants {
    static let keyPath = "runningApplications"
    static let restartAttempts = 10
    static let baseDelay = 0.1
    static let terminationDelay = 1.0
}

// MARK: - TerminationListener

/// Observer for app starring/closing
final class TerminationListener: NSObject {
    // MARK: Private properties

    private var executable: URL
    private var ppid: pid_t

    // MARK: Init

    init(executable: URL, ppid: pid_t) {
        self.executable = executable
        self.ppid = ppid

        super.init()

        NSWorkspace.shared.addObserver(self, forKeyPath: Constants.keyPath, options: [.old, .new], context: nil)

        if getppid() == 1 {
            // Ppid is launchd (1) => parent terminated already
            self.restart()
        }
    }

    // MARK: Deinit

    deinit {
        NSWorkspace.shared.removeObserver(self, forKeyPath: Constants.keyPath)
    }

    // MARK: Overrides

    // Use old style for better working
    // swiftlint:disable:next block_based_kvo
    override func observeValue(
        forKeyPath keyPath: String?,
        of object: Any?,
        // It's override, use real method signature
        // swiftlint:disable:next discouraged_optional_collection
        change: [NSKeyValueChangeKey: Any]?,
        context: UnsafeMutableRawPointer?
    ) {
        guard let keyPath,
              keyPath == Constants.keyPath else {
            return
        }

        let notFound = !NSWorkspace.shared.runningApplications.contains { runningApp in
            runningApp.processIdentifier == self.ppid
        }

        if notFound {
            self.restart()
        }
    }

    // MARK: Private methods

    private func restart(restartAttempts: Int = Constants.restartAttempts, delay: Double = Constants.baseDelay) {
        Task {
            do {
                let openConfiguration = NSWorkspace.OpenConfiguration()
                openConfiguration.activates = false
                openConfiguration.addsToRecentItems = false
                openConfiguration.hides = false
                try await NSWorkspace.shared.openApplication(at: self.executable, configuration: openConfiguration)
                self.terminateSelf()
            } catch {
                NSLog("INFO -- Restart failed: \(error). Attempts left: \(restartAttempts)")

                guard restartAttempts > 0 else {
                    self.terminateSelf()
                    return
                }

                try? await Task.sleep(seconds: delay)

                let newAttempts = restartAttempts - 1
                let newDelay = delay * 1.475

                self.restart(restartAttempts: newAttempts, delay: newDelay)
            }
        }
    }

    private func terminateSelf() {
        Task {
            try? await Task.sleep(seconds: Constants.terminationDelay)
            exit(EXIT_SUCCESS)
        }
    }
}
