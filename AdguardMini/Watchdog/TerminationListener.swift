// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TerminationListener.swift
//  Watchdog
//

import AppKit
import Darwin

// MARK: - Constants

private enum Constants {
    static let keyPath = "runningApplications"
    static let restartAttempts = 10
    static let baseDelay = 0.1
    static let terminationDelay = 1.0
    static let processExitPollDelay = 0.05
    static let processExitMaxWait = 5.0
    static let relaunchGraceDelay = 0.5
}

// MARK: - TerminationListener

/// Observer for app starring/closing
final class TerminationListener: NSObject {
    // MARK: Private properties

    private var executable: URL
    private var ppid: pid_t
    /// Serializes relaunch scheduling so a burst of `runningApplications`
    /// KVO notifications launches the app only once.
    private let lock = NSLock()
    private var restartScheduled = false

    // MARK: Init

    init(executable: URL, ppid: pid_t) {
        self.executable = executable
        self.ppid = ppid

        super.init()

        NSWorkspace.shared.addObserver(self, forKeyPath: Constants.keyPath, options: [.old, .new], context: nil)

        if getppid() == 1 {
            // Ppid is launchd (1) => parent terminated already
            self.handleAppTerminated()
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
            self.handleAppTerminated()
        }
    }

    // MARK: Private methods

    /// Schedules a single relaunch once the app process is fully gone.
    ///
    /// An accessory app can drop out of `runningApplications` while its
    /// process is still terminating, and relaunching in that window makes
    /// LaunchServices reopen the dying instance, which surfaces the system
    /// "no longer open" warning even though the fresh instance starts a
    /// moment later. Waiting for the process to exit (bounded) plus a short
    /// settle delay lets the app restart silently.
    private func handleAppTerminated() {
        self.lock.lock()
        let alreadyScheduled = self.restartScheduled
        self.restartScheduled = true
        self.lock.unlock()

        guard !alreadyScheduled else {
            return
        }

        Task {
            await self.waitForProcessExit()
            // Give LaunchServices a moment to deregister the dead instance
            // Before `openApplication`, so it launches a fresh process.
            try? await Task.sleep(seconds: Constants.relaunchGraceDelay)
            self.restart()
        }
    }

    /// Waits, with a bounded total time, until the watched app process is
    /// no longer present in the system.
    private func waitForProcessExit() async {
        let deadline = ProcessInfo.processInfo.systemUptime + Constants.processExitMaxWait

        while self.isProcessAlive() && ProcessInfo.processInfo.systemUptime < deadline {
            try? await Task.sleep(seconds: Constants.processExitPollDelay)
        }
    }

    /// Whether a process with the watched pid still exists.
    private func isProcessAlive() -> Bool {
        guard kill(self.ppid, 0) == 0 else {
            // `kill(pid, 0)` reports ESRCH when no process has that pid.
            return errno != ESRCH
        }
        return true
    }

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
