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

    private let licenseStateProvider: LicenseStateProvider
    private let eventBus: EventBus

    init(
        settingsCallbacksGetter: @autoclosure @escaping () -> SettingsCallbackService,
        accountCallbacksGetter: @autoclosure @escaping () -> AccountCallbackService,
        trayCallbacksGetter: @autoclosure @escaping () -> TrayCallbackService,
        userRulesCallbacksGetter: @autoclosure @escaping () -> UserRulesCallbackService,
        filtersCallbacksGetter: @autoclosure @escaping () -> FiltersCallbackService,
        licenseStateProvider: LicenseStateProvider,
        eventBus: EventBus
    ) {
        self.settingsCallbacksGetter = settingsCallbacksGetter
        self.accountCallbacksGetter = accountCallbacksGetter
        self.trayCallbacksGetter = trayCallbacksGetter
        self.userRulesCallbacksGetter = userRulesCallbacksGetter
        self.filtersCallbacksGetter = filtersCallbacksGetter

        self.eventBus = eventBus
        self.licenseStateProvider = licenseStateProvider

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

        self.runAsyncIfStarted { [weak self] in
            self?.settingsCallbacks.onSafariExtensionUpdate(update.toProto())
            self?.trayCallbacks.onSafariExtensionUpdate(update.toProto())
        }
    }

    @objc func onLoginItemStateChange(notification: Notification) {
        if let isEnabled: Bool = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                self?.settingsCallbacks.onLoginItemStateChange(BoolValue(isEnabled))
                self?.trayCallbacks.onLoginItemStateChange(BoolValue(isEnabled))
            }
        }
    }

    @objc func onLicenseInfoUpdated(notification: Notification) {
        let license: AppStatusInfo? = self.eventBus.parseNotification(notification)
        self.runAsyncIfStarted { [weak self] in
            Task { [weak self] in
                guard let self else { return }

                let protoLicense: LicenseOrError
                if let license {
                    let canReset = await licenseStateProvider.canReset(for: license)
                    protoLicense = license.toProto(canReset: canReset)
                } else {
                    protoLicense = .licenseError
                }

                self.accountCallbacks.onLicenseUpdate(protoLicense)
                self.trayCallbacks.onLicenseUpdate(protoLicense)
            }
        }
    }

    @objc func onImportStateChange(notification: Notification) {
        if let status: ImportStatusDTO = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                self?.settingsCallbacks.onImportStateChange(status.toProto())
            }
        }
    }

    @objc func onUserFilterChange(notification: Notification) {
        if let userRules: [FilterRule] = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                self?.userRulesCallbacks.onUserFilterChange(
                    UserRulesCallbackState(rules: userRules.toProto())
                )
            }
        }
    }

    @objc func onFilterStatusResolved(notification: Notification) {
        if let result: FiltersUpdateResult? = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                if let result {
                    self?.trayCallbacks.onFilterStatusResolved(result.toProto())
                } else {
                    self?.trayCallbacks.onFilterStatusResolved(FiltersStatus(status: [], error: true))
                }
            }
        }
    }

    @objc func onFiltersUpdate() {
        self.runAsyncIfStarted { [weak self] in
            self?.filtersCallbacks.onFiltersUpdate(EmptyValue())
        }
    }

    @objc func onFiltersMetaUpdated(notification: Notification) {
        if let filterIndex: FiltersIndex = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                self?.filtersCallbacks.onFiltersIndexUpdate(filterIndex.toProto())
            }
        }
    }

    @objc func onCustomFilterSubscriptionUrlReceived(notification: Notification) {
        if let url: String = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                self?.filtersCallbacks.onCustomFiltersSubscribe(StringValue(url))
            }
        }
    }

    @objc func onSettingsPageRequested(notification: Notification) {
        if let page: String = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                self?.settingsCallbacks.onSettingsPageRequested(StringValue(page))
            }
        }
    }

    @objc func onApplicationVersionStatusResolved(notification: Notification) {
        if let available: Bool = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                self?.trayCallbacks.onApplicationVersionStatusResolved(BoolValue(available))
                self?.settingsCallbacks.onApplicationVersionStatusResolved(BoolValue(available))
            }
        }
    }

    @objc func onHardwareAccelerationChanged(notification: Notification) {
        if let value: Bool = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                self?.settingsCallbacks.onHardwareAccelerationChange(BoolValue(value))
            }
        }
    }

    @objc func onEffectiveThemeChanged(notification: Notification) {
        if let incomingTheme: Theme = self.eventBus.parseNotification(notification) {
            self.runAsyncIfStarted { [weak self] in
                Task {
                    let theme = await MainActor.run { EffectiveThemeValue.resolve(incomingTheme) }
                    self?.trayCallbacks.onEffectiveThemeChanged(theme)
                    self?.settingsCallbacks.onEffectiveThemeChanged(theme)
                }
            }
        }
    }

    @objc func onSettingsWindowOpened(_: Notification) {
        self.runAsyncIfStarted { [weak self] in
            self?.settingsCallbacks.onSettingsWindowOpened(EmptyValue())
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

    private func subscribe(selector: Selector, event: Event) {
        self.eventBus.subscribe(
            observer: self,
            selector: selector,
            event: event
        )
    }
}
