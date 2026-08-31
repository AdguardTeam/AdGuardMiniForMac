// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UpdaterController.swift
//  AdguardMini
//

import Cocoa
import Foundation

import AML
import AppBackend

// MARK: - UpdaterController

protocol UpdaterController {
    func checkForUpdate(silentCheck: Bool)
    func setAutoUpdate(autoUpdate: Bool)
}

#if !MAS

private enum Constants {
    static let updaterFeedKey = "SUFeedURL"
    static let updaterFeedCheckDataTimeout = TimeInterval(2.0)

    enum UpdateChannel: String {
        case nightly
        case beta
        case release

        init(rawValue: String) {
            switch rawValue {
            case Self.nightly.rawValue:
                self = .nightly
            case Self.beta.rawValue:
                self = .beta
            case Self.release.rawValue:
                self = .release
            default:
                self = .release
            }
        }

        var allowedChannels: Set<String> {
            switch self {
            case .nightly: [Self.nightlyChannelName, Self.betaChannelName]
            case .beta:    [Self.betaChannelName]
            case .release: []
            }
        }

        // Release channel is default and already exists. More info: https://sparkle-project.org/documentation/publishing/#channels
        private static let betaChannelName    = "beta"
        private static let nightlyChannelName = "nightly"
    }
}

import Sparkle

// MARK: - UpdaterControllerImpl

final class UpdaterControllerImpl: NSObject {
    private var updaterController: SPUStandardUpdaterController!
    private var onFoundUpdate: (String) -> Void
    private var onDidntFindUpdate: () -> Void
    private var onCancelUpdate: () -> Void
    private var willShowUpdate: () -> Void

    /// Guards the feed state (`appcastFeedUrl`, `feedProbeInFlight`) against
    /// concurrent access from Sparkle delegate callbacks and the probe task.
    private let lock = UnfairLock()
    private var appcastFeedUrl: String?
    private var feedProbeInFlight = false

    private let userSettings: UserSettingsManager = UserSettings()

    init(
        onFoundUpdate: @escaping (String) -> Void,
        onDidntFindUpdate: @escaping () -> Void,
        onCancelUpdate: @escaping () -> Void,
        willShowUpdate: @escaping () -> Void
    ) {
        self.onFoundUpdate = onFoundUpdate
        self.onDidntFindUpdate = onDidntFindUpdate
        self.onCancelUpdate = onCancelUpdate
        self.willShowUpdate = willShowUpdate

        super.init()
        self.appcastFeedUrl = Bundle.main.infoDictionary?[Constants.updaterFeedKey] as? String
        self.updaterController = SPUStandardUpdaterController(
            startingUpdater: true,
            updaterDelegate: self,
            userDriverDelegate: self
        )
        self.updaterController.startUpdater()

        // Resolve the appcast host in the background.
        // The startup probe usually finishes before the About section check.
        // The alternate-domain fallback converges on the next check otherwise.
        self.startFeedProbe()
    }

    @discardableResult
    private func processError(error: Error?, function: String = #function, line: UInt = #line) -> UpdateErrorType? {
        guard let error = error as? NSError else { return nil }
        guard error.domain == SUSparkleErrorDomain else {
            LogError("Non-Sparkle error: \(error)", function: function, line: line)
            return .error
        }

        guard let baseError = SUError(rawValue: Int32(error.code)) else {
            LogError("Unknown Sparkle error: \(error)", function: function, line: line)
            return .error
        }

        switch baseError {
        case .noUpdateError,
             .installationAuthorizeLaterError:
            LogDebug("\(error)", function: function, line: line)
            return nil

        case .installationCanceledError:
            LogInfo("\(error)", function: function, line: line)
            return .userCancellation

        case .appcastParseError,
             .appcastError,
             .downloadError,
             .authenticationFailure,
             .runningFromDiskImageError,
             .runningTranslocated,
             .downgradeError:
            LogWarn("\(error)", function: function, line: line)
            return .error

        default:
            LogError("\(error)", function: function, line: line)
            return .error
        }
    }
}

extension UpdaterControllerImpl {
    fileprivate enum UpdateErrorType {
        case userCancellation
        case error
    }
}

// MARK: - Feed resolution

private extension UpdaterControllerImpl {
    /// Describes a claimed feed probe: the primary appcast URL to probe and
    /// its default feed string.
    struct FeedProbe {
        let url: URL
        let feed: String
    }

    /// Starts an asynchronous probe of the primary appcast domain.
    ///
    /// The probe never blocks the main thread. Its result is cached in
    /// `appcastFeedUrl`, which Sparkle reads via `feedURLString(for:)`, so a
    /// running check uses the last resolved value while the refreshed one
    /// converges on the next check. Probing at startup and before each check
    /// keeps the cached host fresh without stalling the UI.
    func startFeedProbe() {
        guard let probe = self.beginFeedProbe() else { return }
        LogInfo("Checking appcast url \(probe.url)")

        Task { [weak self] in
            var hasError = false
            do {
                let response = try await NetworkManagerImpl().data(
                    request:
                        Request(
                            url: probe.url,
                            useProtocolCachePolicy: false,
                            timeoutInterval: Constants.updaterFeedCheckDataTimeout
                        )
                )
                hasError = !(200...299).contains(response.code)
            } catch {
                LogInfo("Checking appcast url error: \(error)")
                hasError = true
            }

            self?.finishFeedProbe(feed: probe.feed, hasError: hasError)
        }
    }

    /// Atomically claims the feed probe, or returns `nil` when another probe
    /// is already in flight or the default feed URL is invalid.
    func beginFeedProbe() -> FeedProbe? {
        let appcastFeed = Bundle.main.infoDictionary?[Constants.updaterFeedKey] as? String
        guard let appcastFeed,
              let url = URL(string: appcastFeed)
        else { return nil }

        let claimed = locked(self.lock) {
            guard !self.feedProbeInFlight else { return false }
            self.feedProbeInFlight = true
            return true
        }
        guard claimed else { return nil }

        return FeedProbe(url: url, feed: appcastFeed)
    }

    /// Applies the result of a finished probe to the cached feed URL.
    ///
    /// When the probe failed, the cached feed switches to the alternate
    /// domain; otherwise it keeps the primary domain.
    func finishFeedProbe(feed: String, hasError: Bool) {
        locked(self.lock) {
            self.feedProbeInFlight = false

            if hasError {
                var components = URLComponents(string: feed)
                components?.host = BuildConfig.AG_ALTERNATE_UPDATE_DOMAIN
                self.appcastFeedUrl = components?.string ?? self.appcastFeedUrl
            } else {
                self.appcastFeedUrl = feed
            }
        }
    }
}

extension UpdaterControllerImpl: UpdaterController {
    /// Checks for update immediately.
    func checkForUpdate(silentCheck: Bool = false) {
        if silentCheck {
            self.updaterController.updater.checkForUpdateInformation()
        } else {
            if let wnd = NSApp.windows.first(where: {
                $0.identifier?.rawValue == "SUUpdateAlert"
            }) {
                wnd.makeKeyAndOrderFront(self)
            } else {
                self.updaterController.checkForUpdates(self)
            }
        }
    }

    /// Sets autoupdate flag.
    /// - Parameter autoUpdate: autoupdate flag.
    func setAutoUpdate(autoUpdate: Bool) {
        self.updaterController.updater.automaticallyChecksForUpdates = autoUpdate
    }
}

// MARK: - SPUUpdaterDelegate

extension UpdaterControllerImpl: SPUUpdaterDelegate {
    func updater(_ updater: SPUUpdater, didFindValidUpdate item: SUAppcastItem) {
        let version: String = item.displayVersionString
        self.onFoundUpdate(version)
    }

    func updaterDidNotFindUpdate(_ updater: SPUUpdater) {
        self.onDidntFindUpdate()
    }

    func updater(
        _ updater: SPUUpdater,
        didFinishUpdateCycleFor updateCheck: SPUUpdateCheck,
        error: Error?
    ) {
        LogInfo("Updater did finish update cycle for: \(updateCheck)")

        if !self.processError(error: error).isNil {
            self.onCancelUpdate()
        }
    }

    func standardUserDriverWillHandleShowingUpdate(
        _ handleShowingUpdate: Bool,
        forUpdate update: SUAppcastItem,
        state: SPUUserUpdateState
    ) {
        self.willShowUpdate()
    }

    func updater(_ updater: SPUUpdater, mayPerform updateCheck: SPUUpdateCheck) throws {
        LogDebugTrace()

        // Refresh the resolved appcast host in the background.
        // Sparkle reads `feedURLString(for:)` right after this returns.
        // This check uses the last resolved value. The refreshed host.
        // Alternate-domain fallback applies on the next check.
        // A blocking probe here made the About section open with a delay.
        self.startFeedProbe()
    }

    func feedURLString(for updater: SPUUpdater) -> String? {
        let feedUrl = locked(self.lock) { self.appcastFeedUrl }
        LogInfo("appcastFeedUrl: \(feedUrl ?? "nil")")
        return feedUrl
    }

    func allowedChannels(for updater: SPUUpdater) -> Set<String> {
        let channel = Constants.UpdateChannel(rawValue: self.userSettings.currentUpdateChannel)
        let allowedChannels = channel.allowedChannels
        LogDebug("Allowed update channels: \(allowedChannels)")
        return allowedChannels
    }
}

// MARK: - SPUStandardUserDriverDelegate

extension UpdaterControllerImpl: SPUStandardUserDriverDelegate {
    var supportsGentleScheduledUpdateReminders: Bool { true }
}

extension SPUUpdateCheck: @retroactive CustomStringConvertible {
    public var description: String {
        switch self {
        /// The user-initiated update check corresponding to `-[SPUUpdater checkForUpdates]`.
        case .updates:
            "userInitiatedUpdates"
        /// The background scheduled update check corresponding to `-[SPUUpdater checkForUpdatesInBackground]`.
        case .updatesInBackground:
            "updatesInBackground"
        /// The informational probe update check corresponding to `-[SPUUpdater checkForUpdateInformation]`.
        case .updateInformation:
            "updateInformation"
        @unknown default:
            "Unknown default"
        }
    }
}

#else

final class UpdaterControllerImpl: UpdaterController {
    init(
        onFoundUpdate: @escaping (String) -> Void = { _ in },
        onDidntFindUpdate: @escaping () -> Void = {},
        onCancelUpdate: @escaping () -> Void = {},
        willShowUpdate: @escaping () -> Void = {}
    ) {}

    func checkForUpdate(silentCheck: Bool) {}
    func setAutoUpdate(autoUpdate: Bool) {}
}

#endif
