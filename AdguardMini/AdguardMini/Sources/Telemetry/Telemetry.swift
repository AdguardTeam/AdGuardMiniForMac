// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Telemetry.swift
//  AdguardMini
//

import Foundation
import CryptoKit
import AML

// MARK: - Constants

private enum Constants {
    static let baseURL: URL = {
        #if DEBUG
        let host = "https://telemetry.service.agrd.dev"
        #else
        let host = "https://api.agrd-tm.com"
        #endif
        var baseURL = URL(string: host)!
        if let devConfigHost = DeveloperConfigUtils[.telemetryApiUrl] as? String {
            if let url = URL(string: devConfigHost) {
                baseURL = url
            } else {
                LogError("Invalid devConf value for \(DeveloperConfigUtils.Property.telemetryApiUrl): \(devConfigHost)")
            }
        }
        return baseURL
    }()

    static let eventEndpointURL: URL = {
        Self.baseURL.appendingPathComponent("/api/v1/event", conformingTo: .url)
    }()

    static let startSessionEndpointURL: URL = {
        Self.baseURL.appendingPathComponent("/api/v1/session_start", conformingTo: .url)
    }()
}

// MARK: - Telemetry

enum Telemetry {
    enum Event {
        case pageview(Pageview)
        case customEvent(CustomEvent)
    }

    struct Pageview {
        /// Name of shown page, e.g. "settings\_screen".
        let name: String
        /// Name of referrer page, e.g. "stats\_screen".
        let refName: String?

        init(name: String, refName: String? = nil) {
            self.name = name
            self.refName = refName
        }
    }

    struct CustomEvent {
        /// Name of this custom event, e.g. "purchase".
        let name: String
        /// Name of page where custom event occurs, e.g. "login\_screen".
        let refName: String
        let action: String?
        let label: String?

        init(name: String, refName: String, action: String? = nil, label: String? = nil) {
            self.name = name
            self.refName = refName
            self.action = action
            self.label = label
        }
    }
}

// MARK: - Telemetry.Service

extension Telemetry {
    /// Service for sending telemetry events and managing A/B test sessions
    ///
    /// Handles communication with the telemetry backend for:
    /// - Session initialization with A/B test experiment assignments
    /// - Sending pageview and custom events
    /// - Managing experiment lifecycle (new/active/old experiments)
    protocol Service {
        /// Starts a new telemetry session and retrieves A/B test assignments
        ///
        /// This method:
        /// - Removes outdated experiments that no longer exist or changed slots
        /// - Identifies new experiments that need assignment
        /// - Requests experiment assignments from the backend
        /// - Updates local storage with received assignments
        /// - Marks unassigned experiments as `.notInTest`
        ///
        /// Called on app launch to initialize the session.
        func startSession() async

        /// Sends a telemetry event to the backend
        ///
        /// Events are only sent if user has enabled telemetry in settings.
        /// Includes current A/B test assignments and user properties.
        ///
        /// - Parameter event: The event to send (pageview or custom event)
        func sendEvent(_ event: Event) async
    }
}

// MARK: - Telemetry.ServiceImpl

extension Telemetry {
    final actor ServiceImpl: Telemetry.Service {
        private let network: NetworkManager
        private let settings: UserSettingsManager
        private let abTestsStorage: ABTests.Storage
        private let appMetadata: AppMetadata
        private let licenseStateProvider: LicenseStateProvider
        private let telemetry: AML.Telemetry

        init(
            network: NetworkManager,
            settings: UserSettingsManager,
            abTestsStorage: ABTests.Storage,
            appMetadata: AppMetadata,
            licenseStateProvider: LicenseStateProvider
        ) {
            self.network = network
            self.settings = settings
            self.abTestsStorage = abTestsStorage
            self.appMetadata = appMetadata
            self.licenseStateProvider = licenseStateProvider
            self.telemetry = AML.Telemetry(
                syntheticId: SyntheticId.get(),
                appType: .miniMac,
                appVersion: BuildConfig.AG_REPORTED_VERSION
            )
        }

        func startSession() async {
           guard self.settings.allowTelemetry else { return }

            await self.abTestsStorage.removeOldTests()
            let newExperiments = await self.abTestsStorage.getNewTests()

            LogInfo("Start session with new active experiments: \(newExperiments)")

            guard let request = await self.createRequest(for: newExperiments) else {
                LogWarn("Can't create exp start session request")
                return
            }

            guard let data = await self.sendRequest(request) else {
                LogWarn("Can't send exp start session request")
                return
            }

            func createKey(exp: String, slot: ABTests.Experiment) -> String {
                "\(exp)|\(slot)"
            }

            do {
                let result = try self.telemetry.parseStartSessionResponse(from: data)

                let index: [String: ABTests.ActiveExperiment] =
                Dictionary(uniqueKeysWithValues: newExperiments.map { exp in
                    (createKey(exp: exp.rawValue, slot: exp.slot), exp)
                })

                var newExpStates: [ABTests.ActiveExperiment: ABTests.TestOption] = [:]

                for (slotRaw, version) in result {
                    let slot = slotRaw.toDomain()
                    let key = createKey(exp: version.experimentName, slot: slot)

                    guard let activeExp = index[key],
                          let option = version.option?.toDomain()
                    else { continue }

                    newExpStates[activeExp] = option
                }

                for exp in newExperiments where newExpStates[exp] == nil {
                    newExpStates[exp] = .notInTest
                }

                await self.abTestsStorage.updateTests(newExpStates)
            } catch {
                LogWarn("Failed to parse start session response: \(error)")
            }
        }

        func sendEvent(_ event: Telemetry.Event) async {
            guard self.settings.allowTelemetry else { return }

            guard let request = await self.createRequest(for: event) else {
                LogDebug("Can't create telemetry event request")
                return
            }

            await self.sendRequest(request)
        }

        private func createRequest(for tests: [ABTests.ActiveExperiment]) async -> URLRequest? {
            let tests: [AML.Telemetry.Experiment: String] = Dictionary(
                uniqueKeysWithValues: tests.compactMap {
                    if let slot = $0.slot.toAmlType() {
                        return (slot, $0.rawValue)
                    }
                    return nil
                }
            )

            let props = await self.getProps()

            return self.telemetry.startSessionEventRequest(
                url: Constants.startSessionEndpointURL,
                props: props,
                tests: tests
            )
        }

        private func createRequest(for event: Event) async -> URLRequest? {
            let event: AML.Telemetry.Event = switch event {
            case .pageview(let event):
                    .pageview(name: event.name, refName: event.refName)
            case .customEvent(let event):
                    .custom(name: event.name, refName: event.refName)
            }

            let props = await self.getProps()

            return self.telemetry.eventRequest(
                url: Constants.eventEndpointURL,
                event: event,
                props: props
            )
        }

        @discardableResult
        private func sendRequest(
            _ request: URLRequest,
            function: String = #function,
            line: UInt = #line
        ) async -> Data? {
            do {
                let response = try await self.network.data(request: request)
                if response.code / 100 != 2 {
                    LogDebug(
                        "Error telemetry request: HTTP status code \(response.code)", function: function, line: line
                    )
                    return nil
                }
                LogDebug("Telemetry sent", function: function, line: line)
                return response.data
            } catch {
                LogDebug("Error telemetry request: \(error)", function: function, line: line)
                return nil
            }
        }

        private func getProps() async -> AML.Telemetry.Props {
            let activeTests = await self.abTestsStorage.getActiveTests()

            let experiments: [AML.Telemetry.Experiment: AML.Telemetry.ExperimentVersion] = Dictionary(
                uniqueKeysWithValues: activeTests.compactMap {
                    let exp = $0.key
                    let opt = $0.value
                    guard let opt = opt.toAmlType(),
                          let slot = exp.slot.toAmlType() else { return nil }
                    return (
                        slot,
                        .init(experimentName: exp.rawValue, option: opt)
                    )
                }
            )

            return await AML.Telemetry.Props(
                subscriptionDuration: self.getSubscriptionDuration(),
                licenseStatus: self.getLicenseStatus(),
                theme: self.getTheme(),
                retentionCohort: self.getRetentionCohort(),
                experiments: experiments
            )
        }

        private func getSubscriptionDuration() async -> AML.Telemetry.SubscriptionDuration? {
            guard let info = await self.licenseStateProvider.getStoredInfo() else {
                return nil
            }

            if info.licenseLifetime ?? false {
                return .lifetime
            }

            if let duration = info.subscriptionStatus?.duration {
                return switch duration {
                case .monthly: .monthly
                case .yearly:  .annual
                }
            }

            LogDebug("License has no lifetime or duration field")
            return info.licenseStatus != .free ? .other : nil
        }

        private func getLicenseStatus() async -> AML.Telemetry.LicenseStatus? {
            guard let info = await self.licenseStateProvider.getStoredInfo() else {
                return nil
            }

            return switch info.licenseStatus {
            case .free:   .free
            case .trial:  .trial
            case .active: .premium
            default:      .other
            }
        }

        @MainActor
        private func getTheme() async -> AML.Telemetry.Theme {
            switch await self.settings.theme {
            case .system: UIUtils.isDarkMode() ? .systemDark : .systemLight
            case .light:  .light
            case .dark:   .dark
            }
        }

        private func getRetentionCohort() -> AML.Telemetry.RetentionCohort {
            guard let firstStartDate = self.appMetadata.firstStartDate else {
                return .longtime
            }

            let duration = Date.now.timeIntervalSince(firstStartDate)
            if duration > 30.days { return .longtime }
            if duration > 7.days { return .month1 }
            if duration > 1.day { return .week1 }

            return .day1
        }
    }
}

extension Telemetry {
    private enum SyntheticId {
        @UserDefault(.telemetryId)
        static var stored: String?

        private static let lock = UnfairLock()
        private static var runtime: String?

        static func get() -> String {
            locked(self.lock) {
                if let id = self.runtime {
                    return id
                }

                if let id = self.stored,
                   self.isValid(id) {
                    self.runtime = id
                    return id
                }

                let new = self.create()
                self.stored = new
                self.runtime = new
                return new
            }
        }

        static func create() -> String {
            let syntheticIdLength = 8
            let syntheticIdCharacters: [Character] = Array("abcdef123456789")

            let randomBytes = SymmetricKey(size: .bits256)
                .withUnsafeBytes { Array($0.prefix(syntheticIdLength)) }

            let characters = randomBytes.map { byte in
                syntheticIdCharacters[Int(byte) % syntheticIdCharacters.count]
            }

            return String(characters)
        }

        static func isValid(_ value: String) -> Bool {
            value.range(of: #"^[a-f1-9]{8}$"#, options: .regularExpression) != nil
        }
    }
}

private extension ABTests.Experiment {
    func toAmlType() -> AML.Telemetry.Experiment? {
        switch self {
        case .exp1: .experiment1
        case .exp2: .experiment2
        case .exp3: .experiment3
        case .__placeholder__: nil
        }
    }
}

private extension ABTests.TestOption {
    func toAmlType() -> AML.Telemetry.Experiment.Option? {
        switch self {
        case .optA:      return .optA
        case .optB:      return .optB
        case .notInTest: return nil
        }
    }
}

private extension AML.Telemetry.Experiment {
    func toDomain() -> ABTests.Experiment {
        switch self {
        case .experiment1: .exp1
        case .experiment2: .exp2
        case .experiment3: .exp3
        }
    }
}

private extension AML.Telemetry.Experiment.Option {
    func toDomain() -> ABTests.TestOption {
        switch self {
        case .optA: .optA
        case .optB: .optB
        }
    }
}
