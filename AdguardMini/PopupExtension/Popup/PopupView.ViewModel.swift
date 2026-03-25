// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupViewModel.swift
//  EntryExtension
//

import SafariServices
import SwiftUI
import Combine

import AGSEDesignSystem
import AML

// MARK: - Constants

fileprivate enum Constants {
    static let rateAdguardMiniURL: URL = URL(string: "https://link.adtidy.org/forward.html?action=appstore&from=options_screen&app=mac-mini")!
}

// MARK: - ToolbarHandler

protocol ToolbarHandler {
    func validateToolbarItem(in window: SFSafariWindow, validationHandler: @escaping (Bool, String) -> Void)
}

// MARK: - PopupViewControllerDelegate

protocol PopupViewControllerDelegate: AnyObject {
    func dismissPopover()
}

// MARK: - PopupView.ViewModel

extension PopupView {
    final class ViewModel: ObservableObject {
        // MARK: Public properties

        weak var popupViewControllerDelegate: PopupViewControllerDelegate?

        // MARK: Private properties

        private var currentUrl: URL? {
            didSet {
                Task { @MainActor in
                    self.processUrl(url: self.currentUrl)
                }
            }
        }

        private let safariApi: SafariApiInteractor
        private let advancedBlocker: AdvancedBlockerHandler
        private let mainAppDiscovery: MainAppDiscovery
        private let safariApp: SafariApp
        private let validationStatePreparer: PopupStatePreparer

        private var lastTimestamp: EBATimestamp = .zero

        private var isInValidation: Bool = false

        private var runningAppMonitor = NSWorkspace.shared
            .publisher(for: \.runningApplications)
            .scan(false) { _, runningApps in
                runningApps.contains { runningApp in
                    runningApp.bundleIdentifier == BuildConfig.AG_APP_ID
                }
            }
            .removeDuplicates()
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()

        private var cancellableSet: Set<AnyCancellable> = []

        @Published private var isProtectionEnabled: Bool = false
        @Published private var isMainAppRunning: Bool = false

        @Published private(set) var domain: String = ""
        @Published private(set) var isSystemPage: Bool = true

        @Published private(set) var isAllExtensionsEnabled: Bool = true
        @Published private(set) var isOnboardingCompleted: Bool = false
        @Published private var isOnboardingStateFresh: Bool = false
        @Published private(set) var popupLayout: Layout = .domain
        @Published private(set) var popupState: InfoView.Configuration.State = .base

        @Published var isProtectionEnabledForUrl: Bool = true

        var isBusy: Bool { self.popupState == .loading }
        var isPauseButtonAvailable: Bool { self.popupLayout == .domain }

        // MARK: Init

        init(
            safariApi: SafariApiInteractor,
            advancedBlocker: AdvancedBlockerHandler,
            mainAppDiscovery: MainAppDiscovery,
            safariApp: SafariApp,
            validationStatePreparer: PopupStatePreparer
        ) {
            self.safariApi = safariApi
            self.advancedBlocker = advancedBlocker
            self.mainAppDiscovery = mainAppDiscovery
            self.safariApp = safariApp
            self.validationStatePreparer = validationStatePreparer
            self.setupPublishers()
        }

        deinit {
            LogDebug("\(self) deinit")
        }

        // MARK: Setup publishers

        private func setupPublishers() {
            self.assignAndStorePublishers()
            self.setupSinksAndScans()
        }

        private func assignAndStorePublishers() {
            self.runningAppMonitor
                .weakAssign(to: \Self.isMainAppRunning, on: self)
                .store(in: &self.cancellableSet)

            Publishers
                .CombineLatest4(
                    self.runningAppMonitor,
                    self.$isProtectionEnabled,
                    self.$isOnboardingCompleted,
                    self.$isOnboardingStateFresh
                )
                .map { mainAppRunning, protectionEnabled, isOnboardingCompleted, onboardingFresh -> PopupView.Layout in
                    LogDebug("Map new values for popup state. (mainAppRunning: \(mainAppRunning), protectionEnabled: \(protectionEnabled), onboardingCompleted: \(isOnboardingCompleted), onboardingFresh: \(onboardingFresh))")
                    var newPopupLayout: PopupView.Layout
                    if !mainAppRunning {
                        newPopupLayout = .adguardNotLaunched
                    } else if !onboardingFresh {
                        // Avoid premature onboarding prompt until we fetch a fresh status after app launch
                        newPopupLayout = .adguardNotLaunched
                    } else if isOnboardingCompleted && protectionEnabled {
                        newPopupLayout = .domain
                    } else if !isOnboardingCompleted {
                        newPopupLayout = .onboardingWasntCompleted
                    } else {
                        newPopupLayout = .protectionIsDisabled
                    }
                    return newPopupLayout
                }
                .removeDuplicates()
                .weakAssign(to: \Self.popupLayout, on: self)
                .store(in: &self.cancellableSet)
        }

        private func setupSinksAndScans() {
            // Update popupState
            self.$popupLayout
                .sink { [weak self] _ in
                    Task { @MainActor [weak self] in
                        self?.popupState = .base
                        self?.safariApp.setToolbarItemsNeedUpdate()
                    }
                }
                .store(in: &self.cancellableSet)

            self.$isProtectionEnabledForUrl
                .dropFirst()
                .removeDuplicates()
                .sink { [weak self] newValue in
                    guard let self,
                          !self.isInValidation,
                          self.popupState != .error
                    else { return }

                    LogDebug("User protection status changed: \(newValue)")
                    self.setFilteringStatusWithUrl(self.currentUrl, isEnabled: newValue)
                    self.sendTelemetryAsync(
                        .action(
                            .protectionPopupClick,
                            screen: self.telemetryMainOrExtensionsOffScreen()
                        )
                    )
                }
                .store(in: &self.cancellableSet)

            // When the main app starts, re-fetch onboarding and extensions state to avoid stale values
            // (e.g., default false due to XPC timeout when app was not running)
            self.$isMainAppRunning
                .removeDuplicates()
                .sink { [weak self] running in
                    guard let self else { return }
                    guard running else { return }
                    // Mark stale synchronously to prevent a one-frame switch to domain before refresh starts
                    self.isOnboardingStateFresh = false
                    Task { @MainActor in
                        // Main app just started; ensure we refresh and then revalidate toolbar
                        await self.refreshPrereqs(markStale: false, triggerToolbarUpdate: true)
                    }
                }
                .store(in: &self.cancellableSet)
        }

        // MARK: Private methods

        private func setFilteringStatusWithUrl(_ url: URL?, isEnabled: Bool) {
            guard let url = url?.absoluteString else { return }
            self.performAction(actionName: .setFilteringStatusForUrl) {
                _ = try await self.safariApi.setFilteringStatusWithUrl(url, isEnabled: isEnabled)
                await self.safariApp.reloadActivePage()
            }
        }

        private func setProtectionStatus(_ enabled: Bool) {
            self.performAction(actionName: enabled ? .setProtectionStatusToEnabled : .setProtectionStatusToDisabled) {
                let timestamp = try await self.safariApi.setProtectionStatus(enabled)
                let appState = try await self.safariApi.appState(after: timestamp)
                self.isProtectionEnabled = appState.isProtectionEnabled
                self.safariApp.setToolbarItemsNeedUpdate()
            }
        }

        @MainActor
        private func processUrl(url: URL?) {
            var hostCandidate = url?.host
            let isRegularHost = hostCandidate != nil
            if !isRegularHost, let scheme = url?.scheme {
                hostCandidate = "\(scheme)://"
            }

            self.domain = hostCandidate ?? .localized.base.item_title_secure_page
            self.isSystemPage = hostCandidate.isNil
        }

        private func errorProcessing(_ error: Error) async {
            LogError("Error occurred: \(error)")
            await MainActor.run {
                if self.popupLayout == .domain {
                    self.popupState = .base
                    self.popupLayout = .somethingWentWrong
                } else {
                    self.popupState = .error
                }
            }
        }

        @MainActor
        private func refreshPrereqs(markStale: Bool, triggerToolbarUpdate: Bool = false) async {
            if markStale { self.isOnboardingStateFresh = false }
            if let completed = try? await self.safariApi.isOnboardingCompleted() {
                self.isOnboardingCompleted = completed
                self.isOnboardingStateFresh = true
            }
            if let allEnabled = try? await self.safariApi.isAllExtensionsEnabled() {
                self.isAllExtensionsEnabled = allEnabled
            }
            if triggerToolbarUpdate {
                // Request toolbar revalidation with updated state
                self.safariApp.setToolbarItemsNeedUpdate()
            }
        }

        private func setRawLogLevel(from rawValue: Int32) {
            guard let newLogLevel = LogLevel(rawValue: Int(rawValue)),
                  Logger.shared.logLevel != newLogLevel else { return }
            LogInfo("Going to set log level to \(newLogLevel) (was \(Logger.shared.logLevel)")
            Logger.shared.logLevel = newLogLevel
        }

        private func handleAppStateChanged(_ lastCheckTime: EBATimestamp) {
            if self.lastTimestamp < lastCheckTime {
                LogDebug("last check time: \(EBAAppState.timestampString(lastCheckTime))")
                self.lastTimestamp = lastCheckTime
                self.safariApp.setToolbarItemsNeedUpdate()
            }
        }

        private func performAction(
            actionName: Action,
            dismissPopover: Bool = false,
            operation: @escaping () async throws -> Void
        ) {
            let name = actionName.rawValue
            LogDebug("Starting action: \(name)")
            Task { @MainActor in
                do {
                    self.popupState = .loading
                    try await operation()
                    if dismissPopover { self.popupViewControllerDelegate?.dismissPopover() }
                    self.popupState = .base
                    LogDebug("Action succeeded: \(name)")
                } catch {
                    LogDebug("Action failed: \(name) error=\(error)")
                    await self.errorProcessing(error)
                    if actionName == .setProtectionStatusToEnabled {
                        self.sendTelemetryAsync(.pageView(.failedEnableProtection))
                    }
                }
            }
        }

        private func sendTelemetryAsync(
            _ event: Telemetry.Event,
            file: String = #fileID,
            function: String = #function,
            line: UInt = #line
        ) {
            Task {
                do {
                    switch event {
                    case .pageView(let screen):
                        try await self.safariApi.telemetryPageViewEvent(screen)
                    case .action(let action, let screen):
                        try await self.safariApi.telemetryActionEvent(action, screen: screen)
                    }
                    LogDebug("Did send telemetry event", file: file, function: function, line: line)
                } catch {
                    LogDebug("Can't send telemetry event: \(error)", file: file, function: function, line: line)
                }
            }
        }

        private func telemetryMainOrExtensionsOffScreen() -> Telemetry.Screen {
            self.isAllExtensionsEnabled ? .main : .extensionsOff
        }
    }
}

// MARK: - UI actions

extension PopupView.ViewModel {
    func fixItClicked() {
        self.performAction(actionName: .openSafariSettings, dismissPopover: true) {
            try await self.safariApi.openSafariSettings()
            self.sendTelemetryAsync(.action(.fixItPopupClick, screen: self.telemetryMainOrExtensionsOffScreen()))
        }
    }

    func blockElementClicked() {
        Task { @MainActor in
            guard let page = await self.safariApp.getActivePage() else { return }
            page.dispatchMessageToScript(withName: OutgoingExtensionMessage.blockElementPing.rawValue)
            self.popupViewControllerDelegate?.dismissPopover()
            self.sendTelemetryAsync(.action(.blockElementPopupClick, screen: self.telemetryMainOrExtensionsOffScreen()))
        }
    }

    func reportAnIssueClicked() {
        guard let currentUrl = self.currentUrl?.absoluteString else {
            LogError("Attempting to report a system page is not supported")
            return
        }

        self.performAction(actionName: .reportSite, dismissPopover: true) {
            let reportUrlString = try await self.safariApi.reportSite(with: currentUrl)
            guard let reportUrl = URL(string: reportUrlString) else { return }

            await self.safariApp.openUrlInNewTab(reportUrl)
            self.sendTelemetryAsync(.action(.reportIssueClick, screen: self.telemetryMainOrExtensionsOffScreen()))
        }
    }

    func rateAdguardMiniClicked() {
        self.popupViewControllerDelegate?.dismissPopover()
        NSWorkspace.shared.open(Constants.rateAdguardMiniURL)
        Task {
            self.sendTelemetryAsync(.action(.rateMiniPopupClick, screen: self.telemetryMainOrExtensionsOffScreen()))
        }
    }

    func buttonClicked() {
        guard self.popupState != .loading else { return }

        switch self.popupLayout {
        case .domain:
            return
        case .adguardNotLaunched:
            self.performAction(actionName: .launchMainApp) {
                self.mainAppDiscovery.runMainApplication()
            }
        case .protectionIsDisabled:
            self.setProtectionStatus(true)
        case .somethingWentWrong:
            self.performAction(actionName: .restartMainApp) {
                try await self.mainAppDiscovery.restartMainApplication()
            }
        case .onboardingWasntCompleted:
            self.settingsClicked()
        }
    }

    func settingsClicked() {
        self.performAction(actionName: .openSettings, dismissPopover: true) {
            try await self.mainAppDiscovery.openSettings()
            let screen: Telemetry.Screen = if self.popupLayout == .protectionIsDisabled {
                .protectionDisabled
            } else {
                self.telemetryMainOrExtensionsOffScreen()
            }
            self.sendTelemetryAsync(.action(.settingPopupClick, screen: screen))
        }
    }

    func pauseClicked() {
        self.setProtectionStatus(false)
        self.sendTelemetryAsync(.action(.pauseProtectionPopupClick, screen: self.telemetryMainOrExtensionsOffScreen()))
    }

    func sendPageViewForCurrentLayout() {
        let screen: Telemetry.Screen? = switch self.popupLayout {
        case .domain:
            self.telemetryMainOrExtensionsOffScreen()
        case .protectionIsDisabled:
            .protectionDisabled
        case .somethingWentWrong:
            .failedEnableProtection
        case .adguardNotLaunched, .onboardingWasntCompleted:
            nil
        }

        if let screen {
            self.sendTelemetryAsync(.pageView(screen))
        }

        Task {
            try? await self.safariApi.notifyWindowOpened()
        }
    }
}

// MARK: - ToolbarHandler

extension PopupView.ViewModel: ToolbarHandler {
    func validateToolbarItem(in window: SFSafariWindow, validationHandler: @escaping (Bool, String) -> Void) {
        LogDebugTrace()

        Task { @MainActor in
            // Refresh prerequisites without triggering another toolbar update
            await self.refreshPrereqs(markStale: false, triggerToolbarUpdate: false)

            await self.performToolbarValidation(window: window, validationHandler: validationHandler)
        }
    }

    @MainActor
    private func performToolbarValidation(
        window: SFSafariWindow,
        validationHandler: @escaping (Bool, String) -> Void
    ) async {
        guard let toolbarItem = await window.toolbarItem() else {
            LogError("Nil toolbar item")
            validationHandler(false, "")
            return
        }

        if !self.isMainAppRunning || !self.isOnboardingStateFresh || !self.isOnboardingCompleted {
            LogDebug("Main App is \(self.isMainAppRunning ? "" : "not ")running, onboardingFresh=\(self.isOnboardingStateFresh), onboarding is \(self.isOnboardingCompleted ? "" : "not ")completed -- state: false, result: true")
            toolbarItem.setImage(SEImage.Toolbar.nsToolbarOff)
            validationHandler(true, "")
            return
        }

        let state = await self.validationStatePreparer.prepareState(
            window: window,
            toolbarItem: toolbarItem
        )
        let popupIconState = state.popupIconState
        let protectionForUrlState = state.protectionForUrlState
        self.isProtectionEnabled = state.isProtectionEnabled
        self.currentUrl = protectionForUrlState.currentUrl

        self.isInValidation = true
        self.isProtectionEnabledForUrl = protectionForUrlState.isProtectionEnabledForCurrentUrl
        self.isInValidation = false

        toolbarItem.setImage(popupIconState.toolbarImage)
        validationHandler(popupIconState.enabled, popupIconState.message)
    }
}

// MARK: - ExtensionSafariApiClientDelegate

extension PopupView.ViewModel: ExtensionSafariApiClientDelegate {
    func appStateChanged(_ appState: EBAAppState) {
        DispatchQueue.main.async { [weak self, appState] in
            guard let self else { return }

            self.handleAppStateChanged(appState.lastCheckTime)
            self.isProtectionEnabled = appState.isProtectionEnabled
            self.setRawLogLevel(from: appState.logLevel)
        }
    }

    func setLogLevel(_ logLevel: LogLevel) {
        LogVerboseTrace()
        LogConfig.setLogLevelAsyncly(logLevel)
    }

    func setTheme(_ theme: Theme) {
        LogVerboseTrace()
        Task {
            await NSApplication.shared.setTheme(theme)
        }
    }
}

private extension PopupView.ViewModel {
    enum Action: String {
        case setFilteringStatusForUrl = "Set filtering status for url"
        case setProtectionStatusToEnabled = "Set protection status to enabled"
        case setProtectionStatusToDisabled = "Set protection status to disabled"
        case openSafariSettings = "Open Safari Settings"
        case reportSite = "Report site"
        case launchMainApp = "Launch main app"
        case restartMainApp = "Restart main app"
        case openSettings = "Open settings"
    }
}
