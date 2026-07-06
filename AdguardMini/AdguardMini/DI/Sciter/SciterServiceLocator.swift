// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SciterServiceLocator.swift
//  AdguardMini
//

import SciterSchema
import SciterSwift

// MARK: - SciterServiceDependent

protocol SciterServiceDependent: AnyObject {
    var app: SciterSwift.App { get }
}

extension SciterServiceDependent {
    func setupSciterServices() {
        SciterServiceLocator.shared.injectDependencies(in: self)
    }
}

// MARK: - SciterServiceLocator

private extension SciterServiceLocator {
    func injectDependencies(in client: SciterServiceDependent) {
        self.injectServices(in: client)
        self.injectCallbacks(in: client)
    }

    private func injectServices(in client: SciterServiceDependent) {
        if client is InternalServiceDependent { client.app.add(service: self.internalService) }
        if client is SettingsServiceDependent { client.app.add(service: self.settingsService) }
        if client is AccountServiceDependent { client.app.add(service: self.accountService) }
        if client is AdvancedBlockingServiceDependent { client.app.add(service: self.advancedBlockingService) }
        if client is AppInfoServiceDependent { client.app.add(service: self.appInfoService) }
        if client is FiltersServiceDependent { client.app.add(service: self.filtersService) }
        if client is UserRulesServiceDependent { client.app.add(service: self.userRulesService) }
        if client is OnboardingServiceDependent { client.app.add(service: self.onboardingService) }
        if client is TrayServiceDependent { client.app.add(service: self.trayService) }
        if client is CommonServiceDependent { client.app.add(service: self.commonService) }
        if client is TelemetrySciterServiceDependent { client.app.add(service: self.telemetryService) }
    }

    private func injectCallbacks(in client: SciterServiceDependent) {
        if client is TrayCallbackServiceDependent { client.app.add(callback: self.trayCallbackService) }
        if client is SettingsCallbackServiceDependent { client.app.add(callback: self.settingsCallbackService) }
        if client is AccountCallbackServiceDependent { client.app.add(callback: self.accountCallbackService) }
        if client is FiltersCallbackServiceDependent { client.app.add(callback: self.filtersCallbackService) }
        if client is UserRulesCallbackServiceDependent { client.app.add(callback: self.userRulesCallbackService) }
        if client is OnboardingCallbackServiceDependent { client.app.add(callback: self.onboardingCallbackService) }
    }
}

private final class SciterServiceLocator {
    static let shared = SciterServiceLocator()

    private lazy var internalService: InternalService.ServiceType = Sciter.InternalServiceImpl()
    private lazy var settingsService: SettingsService.ServiceType = Sciter.SettingsServiceImpl()
    private lazy var accountService: SciterSchema.AccountService.ServiceType = Sciter.AccountServiceImpl()
    private lazy var advancedBlockingService: AdvancedBlockingService.ServiceType = Sciter.AdvancedBlockingServiceImpl()
    private lazy var appInfoService: AppInfoService.ServiceType = Sciter.AppInfoServiceImpl()
    private lazy var filtersService: FiltersService.ServiceType = Sciter.FiltersServiceImpl()
    private lazy var userRulesService: UserRulesService.ServiceType = Sciter.UserRulesServiceImpl()
    private lazy var onboardingService: OnboardingService.ServiceType = Sciter.OnboardingServiceImpl()
    private lazy var commonService: CommonService.ServiceType = Sciter.CommonServiceImpl()
    private lazy var trayService: TrayService.ServiceType = Sciter.TrayServiceImpl()
    private lazy var telemetryService: TelemetryService.ServiceType = Sciter.TelemetryServiceImpl()

    private lazy var trayCallbackService: TrayCallbackService = TrayCallbackService()
    private lazy var settingsCallbackService: SettingsCallbackService = SettingsCallbackService()
    private lazy var accountCallbackService: AccountCallbackService = AccountCallbackService()
    private lazy var filtersCallbackService: FiltersCallbackService = FiltersCallbackService()
    private lazy var userRulesCallbackService: UserRulesCallbackService = UserRulesCallbackService()
    private lazy var onboardingCallbackService: OnboardingCallbackService = OnboardingCallbackService()

    private init() {}
}
