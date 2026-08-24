// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebViewCallbackCoordinator.swift
//  AdguardMini
//

import Foundation
import FLM
import ProtoSchema

/// Routes native EventBus notifications to WKWebView callback services.
final class WebViewCallbackCoordinator {
    private let eventBus: EventBus
    private let tray: TrayCallbackService
    private let settings: SettingsCallbackService
    private let onboarding: OnboardingCallbackService
    private let account: AccountCallbackService
    private let userRules: UserRulesCallbackService
    private let filters: FiltersCallbackService
    private let userRulesEditor: UserRulesCallbackService
    private let settingsEditor: SettingsCallbackService
    private let licenseStateProvider: LicenseStateProvider
    private let urlFilterStateAssembler: URLFilterStateAssembler
    private let urlFilterLock = NSLock()
    private var urlFilterAssemblyTask: Task<Void, Never>?

    /// Creates the coordinator and subscribes to required events.
    /// - Parameters:
    ///   - eventBus: App event bus.
    ///   - licenseStateProvider: License reset capability provider.
    ///   - urlFilterStateAssembler: URL filter state assembler.
    init(eventBus: EventBus,
         licenseStateProvider: LicenseStateProvider,
         urlFilterStateAssembler: URLFilterStateAssembler) {
        self.eventBus = eventBus
        self.licenseStateProvider = licenseStateProvider
        self.urlFilterStateAssembler = urlFilterStateAssembler
        self.tray = WKWebViewAppResolver.trayCallbackService
        self.settings = WKWebViewAppResolver.settingsCallbackService
        self.onboarding = WKWebViewAppResolver.onboardingCallbackService
        self.account = WKWebViewAppResolver.accountCallbackService
        self.userRules = WKWebViewAppResolver.userRulesCallbackService
        self.filters = WKWebViewAppResolver.filtersCallbackService
        self.userRulesEditor = WKWebViewAppResolver.userRulesEditorCallbackService
        self.settingsEditor = WKWebViewAppResolver.settingsEditorCallbackService
        subscribe()
    }

    // MARK: - Subscriptions

    /// Registers all EventBus subscriptions used by WKWebView callbacks.
    private func subscribe() {
        subscribe(#selector(filterStatusResolved(_:)), .filterStatusResolved)
        subscribe(#selector(appVersionStatusResolved(_:)), .appVersionStatusResolved)
        subscribe(#selector(loginItemStateChange(_:)), .loginItemStateChange)
        subscribe(#selector(safariExtensionUpdate(_:)), .safariExtensionUpdate)
        subscribe(#selector(licenseInfoUpdated(_:)), .licenseInfoUpdated)
        subscribe(#selector(effectiveThemeChanged(_:)), .effectiveThemeChanged)
        subscribe(#selector(trayPageRequested(_:)), .trayPageRequested)
        subscribe(#selector(settingsPageRequested(_:)), .settingsPageRequested)
        subscribe(#selector(settingsWindowOpened(_:)), .settingsWindowOpened)
        subscribe(#selector(importStateChange(_:)), .importStateChange)
        subscribe(#selector(userRulesChanged(_:)), .userFilterChange)
        subscribe(#selector(filtersRulesUpdated(_:)), .filtersRulesUpdated)
        subscribe(#selector(filtersMetadataUpdated(_:)), .filtersMetadataUpdated)
        subscribe(#selector(customFilterSubscriptionUrlReceived(_:)), .customFilterSubscriptionUrlReceived)
        subscribe(#selector(hardwareAccelerationChanged(_:)), .hardwareAccelerationChanged)
        subscribe(#selector(urlFilterStateChanged(_:)), .urlFilterStatusChanged)
        subscribe(#selector(urlFilterStateChanged(_:)), .urlFilterConfigurationChanged)
    }

    /// Subscribes one selector to one EventBus event.
    private func subscribe(_ selector: Selector, _ event: Event) {
        eventBus.subscribe(observer: self, selector: selector, event: event)
    }

    // MARK: - Event handlers

    /// Forwards filter status updates to tray UI.
    @objc private func filterStatusResolved(_ note: Notification) {
        let result = eventBus.parseNotification(note) as FiltersUpdateResult?
        let status = result?.toProto() ?? FiltersStatus(status: [], error: true)
        self.tray.onFilterStatusResolved(status)
    }

    /// Forwards app-version availability to tray and settings.
    @objc private func appVersionStatusResolved(_ note: Notification) {
        guard let available: Bool = self.eventBus.parseNotification(note) else {
            return
        }

        let value = BoolValue(available)
        self.tray.onApplicationVersionStatusResolved(value)
        self.settings.onApplicationVersionStatusResolved(value)
    }

    /// Forwards login-item state to tray and settings.
    @objc private func loginItemStateChange(_ note: Notification) {
        guard let isEnabled: Bool = self.eventBus.parseNotification(note) else {
            return
        }

        let value = BoolValue(isEnabled)
        self.tray.onLoginItemStateChange(value)
        self.settings.onLoginItemStateChange(value)
    }

    /// Forwards Safari extension updates to tray and settings.
    @objc private func safariExtensionUpdate(_ note: Notification) {
        guard let info: [SafariExtensionActivity.DictKey: Any] = self.eventBus.parseNotification(note),
              let activity = info[.activity] as? SafariExtensionActivity,
              !activity.shouldIgnore,
              let update = info[.state] as? CurrentExtensionState
        else {
            return
        }
        let proto: SafariExtensionUpdate = update.toProto()

        self.tray.onSafariExtensionUpdate(proto)
        self.settings.onSafariExtensionUpdate(proto)
    }

    /// Resolves license payload and forwards to tray/account callbacks.
    @objc private func licenseInfoUpdated(_ note: Notification) {
        let license: AppStatusInfo? = eventBus.parseNotification(note)
        Task { [weak self, license] in
            guard let self else { return }
            let protoLicense: LicenseOrError
            let trayProtoLicense: TrayLicenseOrError
            if let license {
                let canReset = await self.licenseStateProvider.canReset(for: license)
                protoLicense = license.toProto(canReset: canReset)
                trayProtoLicense = license.toTrayProto()
            } else {
                protoLicense = .licenseError
                trayProtoLicense = .licenseError
            }
            self.tray.onLicenseUpdate(trayProtoLicense)
            self.account.onLicenseUpdate(protoLicense)
        }
    }

    /// Forwards effective theme updates to all visible modules.
    @objc private func effectiveThemeChanged(_ note: Notification) {
        guard let theme: Theme = eventBus.parseNotification(note) else { return }
        let value = EffectiveThemeValue.resolve(theme)
        self.tray.onEffectiveThemeChanged(value)
        self.settings.onEffectiveThemeChanged(value)
        self.onboarding.onEffectiveThemeChanged(value)
        self.settingsEditor.onEffectiveThemeChanged(value)
    }

    /// Forwards tray page requests from native side.
    @objc private func trayPageRequested(_ note: Notification) {
        guard let page: String = eventBus.parseNotification(note) else { return }
        self.tray.onTrayPageRequested(StringValue(page))
    }

    /// Forwards settings page requests from native side.
    @objc private func settingsPageRequested(_ note: Notification) {
        guard let page: String = eventBus.parseNotification(note) else { return }
        self.settings.onSettingsPageRequested(StringValue(page))
    }

    /// Notifies settings callback when settings window is opened.
    @objc private func settingsWindowOpened(_ note: Notification) {
        self.settings.onSettingsWindowOpened(EmptyValue())
    }

    /// Forwards import-state changes to settings callback.
    @objc private func importStateChange(_ note: Notification) {
        guard let dto: ImportStatusDTO = eventBus.parseNotification(note) else { return }
        self.settings.onImportStateChange(dto.toProto())
    }

    /// Forwards user-rules changes to the user-rules callback.
    @objc private func userRulesChanged(_ note: Notification) {
        guard let rules: [FilterRule] = eventBus.parseNotification(note) else { return }
        let state = UserRulesCallbackState(rules: rules.toProto())
        self.userRules.onUserFilterChange(state)
        self.userRulesEditor.onUserFilterChange(state)
    }

    /// Notifies filters callback that rules content changed.
    @objc private func filtersRulesUpdated(_ note: Notification) {
        self.filters.onFiltersUpdate(EmptyValue())
    }

    /// Forwards updated filters metadata index.
    @objc private func filtersMetadataUpdated(_ note: Notification) {
        guard let index: FiltersIndex = eventBus.parseNotification(note) else { return }
        self.filters.onFiltersIndexUpdate(index.toProto())
    }

    /// Forwards custom-filter subscription URL.
    @objc private func customFilterSubscriptionUrlReceived(_ note: Notification) {
        guard let url: String = eventBus.parseNotification(note) else { return }
        self.filters.onCustomFiltersSubscribe(StringValue(url))
    }

    /// Forwards hardware acceleration preference state.
    @objc private func hardwareAccelerationChanged(_ note: Notification) {
        guard let enabled: Bool = eventBus.parseNotification(note) else { return }
        self.settings.onHardwareAccelerationChange(BoolValue(enabled))
    }

    /// Rebuilds and pushes full URL-filter state to settings.
    @objc private func urlFilterStateChanged(_ note: Notification) {
        self.urlFilterLock.lock()
        self.urlFilterAssemblyTask?.cancel()
        self.urlFilterAssemblyTask = Task { [weak self] in
            // Debounce window: lets back-to-back status/config events coalesce.
            try? await Task.sleep(seconds: 0.5)
            guard let self, !Task.isCancelled else { return }
            let state = await self.urlFilterStateAssembler.makeState()
            guard !Task.isCancelled else { return }
            self.settings.onURLFilterStateChanged(state.toProto())
        }
        self.urlFilterLock.unlock()
    }
}
