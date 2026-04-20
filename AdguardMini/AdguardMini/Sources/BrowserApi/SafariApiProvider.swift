// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariApiProvider.swift
//  AdguardMini
//

import AML
import XPCGateLib
import SafariServices

// MARK: - Constants

private enum Constants {
    static let defaultScreenName = "safari_popup"
}

// MARK: - ExtensionSafariApiProtocolError

enum ExtensionSafariApiProtocolError: Error {
    case cantCreateReportUrl
    case cantSetFilteringStatus
    case cantAddRule
}

// MARK: - SafariApiHandler

protocol SafariApiHandler {
    func start()
    func stop()
}

// MARK: - SafariApiProvider

final class SafariApiProvider: NSObject {
    // MARK: Private properties

    private let workQueue = DispatchQueue(label: "ExtensionSafariApiWorkQueue", autoreleaseFrequency: .workItem)
    private var logLevelObserve: NSKeyValueObservation?
    private var isStopped = true

    private var protocolProvider: XPCProtocolProvider!

    private typealias AppStateChangeInfo = (time: EBATimestamp, block: (_: EBAAppState) -> Void)
    private var appStateChangedBlocks = [AppStateChangeInfo]()

    private let proxyStorage: XPCConnectionStorage
    private let supportService: Support
    private let filtersSupervisor: FiltersSupervisor
    private let protectionService: ProtectionService
    private let safariExtensionStatusManager: SafariExtensionStatusManager
    private let urlFilteringChecker: UrlFilteringChecker
    private let userSettingsService: UserSettingsService
    private let telemetry: Telemetry.Service
    private let eventBus: EventBus
    private let keychain: KeychainManager

    #if MAS
    private let appStoreRateUs: AppStoreRateUs?
    #endif

    // MARK: Init

    init(
        proxyStorage: XPCConnectionStorage,
        supportService: Support,
        filtersSupervisor: FiltersSupervisor,
        protectionService: ProtectionService,
        safariExtensionStatusManager: SafariExtensionStatusManager,
        urlFilteringChecker: UrlFilteringChecker,
        userSettingsService: UserSettingsService,
        telemetry: Telemetry.Service,
        keychain: KeychainManager,
        eventBus: EventBus,
        appStoreRateUs: AppStoreRateUs?
    ) {
        self.proxyStorage = proxyStorage
        self.supportService = supportService
        self.filtersSupervisor = filtersSupervisor
        self.protectionService = protectionService
        self.safariExtensionStatusManager = safariExtensionStatusManager
        self.urlFilteringChecker = urlFilteringChecker
        self.userSettingsService = userSettingsService
        self.telemetry = telemetry
        self.keychain = keychain
        self.eventBus = eventBus

        #if MAS
        self.appStoreRateUs = appStoreRateUs
        #endif
    }

    // MARK: Deinit

    deinit {
        self.stop()
    }

    // MARK: Private methods

    private func onUserRulesChanged() async {
        let userRule = await self.filtersSupervisor.getUserRules()
        self.eventBus.post(event: .userFilterChange, userInfo: userRule)
    }

    private func checkIsUrlInAllowList(url: String) async -> Bool {
        if let host = URL(string: url)?.host {
            let userRules = await self.filtersSupervisor.getEnabledUserRules()
            return self.urlFilteringChecker.isHostInAllowList(host, by: userRules)
        }
        return false
    }
}

// MARK: - SafariApiHandler implementation

extension SafariApiProvider: SafariApiHandler {
    func start() {
        self.workQueue.sync {
            guard self.isStopped else { return }

            self.protocolProvider = XPCProtocolProvider(
                gate: BuildConfig.AG_HELPER_ID,
                privileged: false,
                protoHandlers: [ExtensionSafariApiProtocolId: self]
            )
            self.protocolProvider.connectToGate()

            self.logLevelObserve = Logger.shared.observe(\.logLevel) { _, _ in
                self.proxyStorage.withRemoteProxies(SafariPopupApi.self) { proxy in
                    proxy.setLogLevel(Logger.shared.logLevel)
                }
            }
            self.isStopped = false
            LogDebug("Started")
        }
    }

    func stop() {
        self.workQueue.sync {
            guard !self.isStopped else { return }
            LogDebug("Stopping")
            self.logLevelObserve = nil
            self.isStopped = true

            self.protocolProvider.disconnect()
            self.protocolProvider = nil

            self.proxyStorage.reset()
        }
    }
}

// MARK: - XPCHandlerProtocol

extension SafariApiProvider: XPCHandlerProtocol {
    func configureConnection(_ connection: NSXPCConnection, forProtocol protocolId: String) {
        self.workQueue.sync {
            guard !self.isStopped else { return }
            self.proxyStorage.configureConnection(connection, forProtocol: protocolId, exportedObject: self)
        }
    }

    func codeSigningRequirement(forProtocol protocolId: String) -> String? {
        BuildConfig.AG_HELPER_REQ
    }
}

// MARK: - SafariApiProvider: MainAppApi implementation

extension SafariApiProvider: MainAppApi {
    private func createAppState(after time: EBATimestamp? = nil) -> EBAAppState {
        if let time {
            LogWarn("Create app state after \(time) is not supported yet")
        }

        let appState = EBAAppState()
        appState.isProtectionEnabled = self.protectionService.isProtectionEnabled
        appState.logLevel = Int32(Logger.shared.logLevel.rawValue)
        appState.theme = Int32(self.userSettingsService.theme.rawValue)
        return appState
    }

    func appState(after time: EBATimestamp, reply: @escaping (EBAAppState?, Error?) -> Void) {
        let appState = self.createAppState(after: time)
        reply(appState, nil)
    }

    func appState(_ reply: @escaping (EBAAppState?, Error?) -> Void) {
        let appState = self.createAppState()
        reply(appState, nil)
    }

    func getCurrentFilteringState(withUrl url: String, reply: @escaping (EBACurrentFilteringState?, Error?) -> Void) {
        Task {
            let filteringState = EBACurrentFilteringState()
            filteringState.isFilteringEnabled = await !self.checkIsUrlInAllowList(url: url)
            reply(filteringState, nil)
        }
    }

    func getExtraState(withUrl url: String, reply: @escaping (Bool, Error?) -> Void) {
        Task {
            let isProtectionEnabled = self.protectionService.isProtectionEnabled
            let isPaid = await self.keychain.getAppStatusInfo()?.isPaid ?? false
            let isExtraActive = self.userSettingsService.advancedBlockingState.adguardExtra
            let isProtectionEnabledForUrl = await !self.checkIsUrlInAllowList(url: url)
            reply(isProtectionEnabled && isProtectionEnabledForUrl && isPaid && isExtraActive, nil)
        }
    }

    func isAllExtensionsEnabled(reply: @escaping (Bool, Error?) -> Void) {
        Task {
            let result = await self.safariExtensionStatusManager.isAllExtensionsEnabled
            reply(result, nil)
        }
    }

    func isOnboardingCompleted(reply: @escaping (Bool, Error?) -> Void) {
        let completed = !self.userSettingsService.firstRun
        reply(completed, nil)
    }

    func setProtectionStatus(_ enabled: Bool, reply: @escaping (EBATimestamp, Error?) -> Void) {
        Task {
            LogError("Not fully implemented")
            await self.protectionService.setProtectionStatus(isEnabled: enabled)
            reply(Date().timeIntervalSince1970, nil)
        }
    }

    func setFilteringStatusWithUrl(_ url: String, isEnabled: Bool, reply: @escaping (EBATimestamp, Error?) -> Void) {
        Task {
            var commonError: Error?

            let hostToUpdate = URL(string: url)?.host ?? ""
            LogInfo("Set filtering status \(isEnabled) for \(!hostToUpdate.isEmpty ? hostToUpdate : "(invalid url)")")
            let result = if isEnabled {
                await self.filtersSupervisor.removeUserRules(.matching { rule in
                    self.urlFilteringChecker.isHostInAllowList(hostToUpdate, by: [rule])
                })
            } else {
                await self.filtersSupervisor.addUserRule(
                    self.urlFilteringChecker.basicAllowlistRule(for: hostToUpdate)
                )
            }
            await self.onUserRulesChanged()

            if !result {
                commonError = ExtensionSafariApiProtocolError.cantSetFilteringStatus
            }
            reply(Date().timeIntervalSince1970, commonError)
        }
    }

    func addRule(_ ruleText: String, reply: @escaping (Error?) -> Void) {
        Task {
            if await self.filtersSupervisor.addUserRule(ruleText) {
                await self.onUserRulesChanged()
                reply(nil)
            } else {
                reply(ExtensionSafariApiProtocolError.cantAddRule)
            }
        }
    }

    func reportSite(with url: String, reply: @escaping (String?, Error?) -> Void) {
        Task {
            guard let reportUrl = await self.supportService.reportSiteUrl(
                reportUrl: url,
                from: Constants.defaultScreenName
            )
            else {
                reply(nil, ExtensionSafariApiProtocolError.cantCreateReportUrl)
                return
            }
            reply(reportUrl.absoluteString, nil)
        }
    }

    func openSafariSettings(reply: @escaping (Error?) -> Void) {
        Task {
            var commonError: Error?
            let identifier =
            await self.safariExtensionStatusManager.firstDisabledExtensionId
            ?? BuildConfig.AG_BLOCKER_GENERAL_BUNDLEID
            do {
                try await SFSafariApplication.showPreferencesForExtension(withIdentifier: identifier)
            } catch {
                commonError = error
                LogDebug("Failed to open safari preferences: \(error)")
            }
            reply(commonError)
        }
    }

    func telemetryPageViewEvent(_ screenName: String, reply: @escaping (Error?) -> Void) {
        Task {
            await self.telemetry.sendEvent(.pageview(.init(name: screenName)))
            reply(nil)
        }
    }

    func telemetryActionEvent(screenName: String, action: String, reply: @escaping (Error?) -> Void) {
        Task {
            await self.telemetry.sendEvent(.customEvent(.init(name: action, refName: screenName)))
            reply(nil)
        }
    }

    func notifyWindowOpened(reply: @escaping (Error?) -> Void) {
        #if MAS
        self.appStoreRateUs?.onWindowOpened()
        #endif
        reply(nil)
    }
}
