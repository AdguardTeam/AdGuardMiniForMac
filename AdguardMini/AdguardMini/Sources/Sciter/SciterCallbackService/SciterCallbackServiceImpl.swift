// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SciterCallbackServiceImpl.swift
//  AdguardMini
//

import Foundation

import SciterSchema
import FLM
import AML

// MARK: - SciterCallbackServiceImpl

final class SciterCallbackServiceImpl: RestartableServiceBase, SciterCallbackService {
    private let settingsCallbacksGetter: () -> SettingsCallbackService
    private var settingsCallbacks: SettingsCallbackService {
        self.settingsCallbacksGetter()
    }

    private let trayCallbacksGetter: () -> TrayCallbackService
    private var trayCallbacks: TrayCallbackService {
        self.trayCallbacksGetter()
    }

    private let accountCallbacksGetter: () -> AccountCallbackService
    private var accountCallbacks: AccountCallbackService {
        self.accountCallbacksGetter()
    }

    private let userRulesCallbacksGetter: () -> UserRulesCallbackService
    private var userRulesCallbacks: UserRulesCallbackService {
        self.userRulesCallbacksGetter()
    }

    private let filtersCallbacksGetter: () -> FiltersCallbackService
    private var filtersCallbacks: FiltersCallbackService {
        self.filtersCallbacksGetter()
    }

    private let urlFilterStateAssembler: URLFilterStateAssembler

    private let licenseStateProvider: LicenseStateProvider
    private let eventBus: EventBus

    /// Whether the settings Sciter window is hidden. Main-actor only.
    /// Hidden windows skip idle (see `deliverToSettings`).
    private let isSettingsHidden: @MainActor () -> Bool

    /// Whether the tray Sciter window is hidden; mirrors `isSettingsHidden`.
    private let isTrayHidden: @MainActor () -> Bool

    init(
        settingsCallbacksGetter: @autoclosure @escaping () -> SettingsCallbackService,
        accountCallbacksGetter: @autoclosure @escaping () -> AccountCallbackService,
        trayCallbacksGetter: @autoclosure @escaping () -> TrayCallbackService,
        userRulesCallbacksGetter: @autoclosure @escaping () -> UserRulesCallbackService,
        filtersCallbacksGetter: @autoclosure @escaping () -> FiltersCallbackService,
        urlFilterStateAssembler: URLFilterStateAssembler,
        licenseStateProvider: LicenseStateProvider,
        isSettingsHidden: @MainActor @escaping () -> Bool,
        isTrayHidden: @MainActor @escaping () -> Bool,
        eventBus: EventBus
    ) {
        self.settingsCallbacksGetter = settingsCallbacksGetter
        self.accountCallbacksGetter = accountCallbacksGetter
        self.trayCallbacksGetter = trayCallbacksGetter
        self.userRulesCallbacksGetter = userRulesCallbacksGetter
        self.filtersCallbacksGetter = filtersCallbacksGetter
        self.urlFilterStateAssembler = urlFilterStateAssembler

        self.eventBus = eventBus
        self.licenseStateProvider = licenseStateProvider
        self.isSettingsHidden = isSettingsHidden
        self.isTrayHidden = isTrayHidden

        super.init()

        self.subscribe(selector: #selector(self.onLicenseInfoUpdated), event: .licenseInfoUpdated)

        self.subscribe(selector: #selector(self.onUserFilterChange), event: .userFilterChange)
        self.subscribe(selector: #selector(self.onFiltersUpdate), event: .filtersRulesUpdated)
        self.subscribe(selector: #selector(self.onFilterStatusResolved), event: .filterStatusResolved)
        self.subscribe(selector: #selector(self.onFiltersMetaUpdated(notification:)), event: .filtersMetadataUpdated)

        self.subscribe(
            selector: #selector(self.onCustomFilterSubscriptionUrlReceived(notification:)),
            event: .customFilterSubscriptionUrlReceived
        )

        self.subscribe(selector: #selector(self.onSafariExtensionUpdate), event: .safariExtensionUpdate)

        self.subscribe(selector: #selector(self.onApplicationVersionStatusResolved), event: .appVersionStatusResolved)

        self.subscribe(selector: #selector(self.onImportStateChange), event: .importStateChange)

        self.subscribe(selector: #selector(self.onSettingsPageRequested), event: .settingsPageRequested)

        self.subscribe(selector: #selector(self.onTrayPageRequested), event: .trayPageRequested)

        self.subscribe(selector: #selector(self.onLoginItemStateChange), event: .loginItemStateChange)

        self.subscribe(
            selector: #selector(self.onHardwareAccelerationChanged(notification:)),
            event: .hardwareAccelerationChanged
        )

        self.subscribe(
            selector: #selector(self.onEffectiveThemeChanged(notification:)),
            event: .effectiveThemeChanged
        )

        self.subscribe(selector: #selector(self.onSettingsWindowOpened), event: .settingsWindowOpened)

        self.subscribe(selector: #selector(self.onURLFilterStateChanged), event: .urlFilterStatusChanged)
        self.subscribe(selector: #selector(self.onURLFilterStateChanged), event: .urlFilterConfigurationChanged)

        LogDebug("Initialized")
    }

    @objc func onSafariExtensionUpdate(notification: Notification) {
        /// Not notified due to UI behavior limitations.
        ///
        /// The UI cannot keep track of what activity caused the callback to be invoked, so this can cause animations to be interrupted.
        func shouldIgnoreNotification(_ activity: SafariExtensionActivity) -> Bool {
            switch activity {
            case .conversion(let processPhase):
                processPhase == .end
            case .reload(let processPhase):
                processPhase == .start
            }
        }

        guard let info: [SafariExtensionActivity.DictKey: Any] = self.eventBus.parseNotification(notification),
              let activity = info[.activity] as? SafariExtensionActivity,
              !shouldIgnoreNotification(activity),
              let update = info[.state] as? CurrentExtensionState
        else {
            return
        }

        self.runOnMainActorIfStarted { `self` in
            let proto: SafariExtensionUpdate = update.toProto()
            self.deliverToSettings(self.settingsCallbacks) { $0.onSafariExtensionUpdate(proto) }
            self.deliverToTray(self.trayCallbacks) { $0.onSafariExtensionUpdate(proto) }
        }
    }

    @objc func onLoginItemStateChange(notification: Notification) {
        guard let isEnabled: Bool = self.eventBus.parseNotification(notification) else {
            return
        }

        let value = BoolValue(isEnabled)
        self.runOnMainActorIfStarted { `self` in
            self.deliverToSettings(self.settingsCallbacks) { $0.onLoginItemStateChange(value) }
            self.deliverToTray(self.trayCallbacks) { $0.onLoginItemStateChange(value) }
        }
    }

    @objc func onLicenseInfoUpdated(notification: Notification) {
        let license: AppStatusInfo? = self.eventBus.parseNotification(notification)

        self.runOnMainActorIfStarted { `self` in
            // The settings window receives the full License message.
            // The tray receives a tray-scoped view exposing only the fields it reads.
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

            self.deliverToSettings(self.accountCallbacks) { $0.onLicenseUpdate(protoLicense) }
            self.deliverToTray(self.trayCallbacks) { $0.onLicenseUpdate(trayProtoLicense) }
        }
    }

    @objc func onImportStateChange(notification: Notification) {
        guard let status: ImportStatusDTO = self.eventBus.parseNotification(notification) else {
            return
        }

        self.runOnMainActorIfStarted { `self` in
            self.deliverToSettings(self.settingsCallbacks) { $0.onImportStateChange(status.toProto()) }
        }
    }

    @objc func onUserFilterChange(notification: Notification) {
        guard let userRules: [FilterRule] = self.eventBus.parseNotification(notification) else {
            return
        }

        self.runOnMainActorIfStarted { `self` in
            self.deliverToSettings(self.userRulesCallbacks) {
                $0.onUserFilterChange(UserRulesCallbackState(rules: userRules.toProto()))
            }
        }
    }

    @objc func onFilterStatusResolved(notification: Notification) {
        guard let result: FiltersUpdateResult? = self.eventBus.parseNotification(notification) else {
            return
        }

        self.runOnMainActorIfStarted { `self` in
            let proto = result?.toProto() ?? FiltersStatus(status: [], error: true)
            self.deliverToTray(self.trayCallbacks) { $0.onFilterStatusResolved(proto) }
        }
    }

    @objc func onFiltersUpdate() {
        self.runOnMainActorIfStarted { `self` in
            self.deliverToSettings(self.filtersCallbacks) { $0.onFiltersUpdate(EmptyValue()) }
        }
    }

    @objc func onFiltersMetaUpdated(notification: Notification) {
        guard let filterIndex: FiltersIndex = self.eventBus.parseNotification(notification) else {
            return
        }

        self.runOnMainActorIfStarted { `self` in
            self.deliverToSettings(self.filtersCallbacks) { $0.onFiltersIndexUpdate(filterIndex.toProto()) }
        }
    }

    @objc func onCustomFilterSubscriptionUrlReceived(notification: Notification) {
        guard let url: String = self.eventBus.parseNotification(notification) else {
            return
        }

        self.runOnMainActorIfStarted { `self` in
            self.deliverToSettings(self.filtersCallbacks) { $0.onCustomFiltersSubscribe(StringValue(url)) }
        }
    }

    @objc func onSettingsPageRequested(notification: Notification) {
        if let page: String = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                self?.settingsCallbacks.onSettingsPageRequested(StringValue(page))
            }
        }
    }

    @objc func onTrayPageRequested(notification: Notification) {
        if let page: String = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                self?.trayCallbacks.onTrayPageRequested(StringValue(page))
            }
        }
    }

    @objc func onApplicationVersionStatusResolved(notification: Notification) {
        guard let available: Bool = self.eventBus.parseNotification(notification) else {
            return
        }

        let value = BoolValue(available)
        self.runOnMainActorIfStarted { `self` in
            self.deliverToTray(self.trayCallbacks) { $0.onApplicationVersionStatusResolved(value) }
            self.deliverToSettings(self.settingsCallbacks) { $0.onApplicationVersionStatusResolved(value) }
        }
    }

    @objc func onHardwareAccelerationChanged(notification: Notification) {
        guard let value: Bool = self.eventBus.parseNotification(notification) else {
            return
        }

        self.runOnMainActorIfStarted { `self` in
            self.deliverToSettings(self.settingsCallbacks) { $0.onHardwareAccelerationChange(BoolValue(value)) }
        }
    }

    @objc func onEffectiveThemeChanged(notification: Notification) {
        guard let incomingTheme: Theme = self.eventBus.parseNotification(notification) else {
            return
        }

        self.runOnMainActorIfStarted { `self` in
            // `EffectiveThemeValue.resolve` is `@MainActor`; this runs on the main actor.
            let theme = EffectiveThemeValue.resolve(incomingTheme)
            self.deliverToTray(self.trayCallbacks) { $0.onEffectiveThemeChanged(theme) }
            self.deliverToSettings(self.settingsCallbacks) { $0.onEffectiveThemeChanged(theme) }
        }
    }

    @objc func onSettingsWindowOpened(_: Notification) {
        self.runAsyncIfStarted { [weak self] in
            self?.settingsCallbacks.onSettingsWindowOpened(EmptyValue())
        }
    }

    @objc func onURLFilterStateChanged() {
        self.runOnMainActorIfStarted { `self` in
            let state = await self.urlFilterStateAssembler.makeState()
            self.deliverToSettings(self.settingsCallbacks) { $0.onURLFilterStateChanged(state.toProto()) }
        }
    }

    private func runAsyncIfStarted(_ completion: @escaping () -> Void) {
        if !self.isStarted {
            LogDebug("Service not started, ignoring")
            return
        }
        Task {
            completion()
        }
    }

    /// Like `runAsyncIfStarted`, but on the main actor.
    /// The target window's visibility is checked before DOM-mutating delivery (`AG-56368`).
    /// Captures `self` weakly and passes a strong reference to `action`.
    /// Supports `async` actions; see `deliverToSettings` / `deliverToTray`.
    private func runOnMainActorIfStarted(_ action: @MainActor @escaping (SciterCallbackServiceImpl) async -> Void) {
        guard self.isStarted else {
            LogDebug("Service not started, ignoring")
            return
        }

        Task { @MainActor [weak self] in
            guard let self else { return }
            await action(self)
        }
    }

    /// Delivers `delivery(service)` to the settings window only when visible.
    /// Hidden Sciter windows skip idle, so queued DOM work crashes on show (`AG-56368`).
    /// Recovered on show via `SettingsCallbackServiceInternal.OnWindowDidBecomeMain`.
    @MainActor
    private func deliverToSettings<T>(_ service: T, _ delivery: (T) -> Void) {
        guard !self.isSettingsHidden() else { return }
        delivery(service)
    }

    /// Tray-window counterpart of `deliverToSettings` (`AG-56368`).
    /// Recovered on show via `TrayCallbackServiceInternal.OnTrayWindowVisibilityChange`.
    @MainActor
    private func deliverToTray<T>(_ service: T, _ delivery: (T) -> Void) {
        guard !self.isTrayHidden() else { return }
        delivery(service)
    }

    private func subscribe(selector: Selector, event: Event) {
        self.eventBus.subscribe(
            observer: self,
            selector: selector,
            event: event
        )
    }
}
