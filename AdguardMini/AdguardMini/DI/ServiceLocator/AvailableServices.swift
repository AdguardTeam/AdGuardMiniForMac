// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AvailableServices.swift
//  AdguardMini
//

protocol SupportDependent:         ServiceDependent { var support:         Support! { get set } }
protocol AppUpdaterDependent:      ServiceDependent { var appUpdater:      AppUpdater! { get set } }
protocol AppMetadataDependent:     ServiceDependent { var appMetadata:     AppMetadata! { get set } }
protocol SentryHelperDependent:    ServiceDependent { var sentryHelper:    SentryHelper! { get set } }
protocol RulesGrouperDependent:    ServiceDependent { var rulesGrouper:    RulesGrouper! { get set } }
protocol BackendServiceDependent:  ServiceDependent { var backendService:  BackendService! { get set } }
protocol ABTestsStorageDependent:  ServiceDependent { var abTestsStorage:  ABTests.Storage! { get set } }
protocol AppResetServiceDependent: ServiceDependent { var appResetService: AppResetService! { get set } }

protocol LoginItemServiceDependent: ServiceDependent { var loginItemService: LoginItemService! { get set } }
protocol SafariApiHandlerDependent: ServiceDependent { var safariApiHandler: SafariApiHandler! { get set } }
protocol TelemetryServiceDependent: ServiceDependent { var telemetryService: Telemetry.Service! { get set }}

protocol FiltersSupervisorDependent:  ServiceDependent { var filtersSupervisor:  FiltersSupervisor! { get set } }
protocol SystemInfoManagerDependent:  ServiceDependent { var systemInfoManager:  SystemInfoManager! { get set } }
protocol ProtectionServiceDependent:  ServiceDependent { var protectionService:  ProtectionService! { get set } }

protocol AppLifecycleServiceDependent: ServiceDependent { var appLifecycleService: AppLifecycleService! { get set } }
protocol ImportExportServiceDependent: ServiceDependent { var importExportService: ImportExportService! { get set } }
protocol SciterAppControllerDependent: ServiceDependent { var sciterAppController: SciterAppsController! { get set } }
protocol UserSettingsServiceDependent: ServiceDependent { var userSettingsService: UserSettingsService! { get set } }
protocol UserSettingsManagerDependent: ServiceDependent { var userSettingsManager: UserSettingsManager! { get set } }
protocol LicenseStateProviderDependent: ServiceDependent { var licenseStateProvider: LicenseStateProvider! { get set } }

protocol AppActivationObserverDependent:  ServiceDependent {
    var appActivationObserver: AppActivationObserver! { get set }
}

protocol EventBusDependent: ServiceDependent { var eventBus: EventBus! { get set } }

protocol SciterCallbackServiceDependent:  ServiceDependent {
    var sciterCallbackService: SciterCallbackService! { get set }
}
protocol SciterOnboardingCallbackServiceDependent: ServiceDependent {
    var sciterOnboardingCallbackService: SciterOnboardingCallbackService! { get set }
}
protocol LegacyMigrationServiceDependent: ServiceDependent {
    var legacyMigrationService: LegacyMigrationService! { get set }
}
protocol TrayIconUpdatesHandlerDependent: ServiceDependent {
    var trayIconUpdatesHandler: TrayIconUpdatesHandler! { get set }
}
protocol StatusBarItemControllerDependent: ServiceDependent {
    var statusBarItemController: StatusBarItemController! { get set }
}
protocol SafariExtensionStateServiceDependent: ServiceDependent {
    var safariExtensionStateService: SafariExtensionStateService! { get set }
}
protocol SafariExtensionStatusManagerDependent: ServiceDependent {
    var safariExtensionStatusManager: SafariExtensionStatusManager! { get set }
}

protocol UrlSchemesProcessorDependent: ServiceDependent {
    var urlSchemesProcessorInjector: (() -> UrlSchemesProcessor)! { get set }
    var urlSchemesProcessor: UrlSchemesProcessor { get }
}

extension UrlSchemesProcessorDependent {
    var urlSchemesProcessor: UrlSchemesProcessor {
        self.urlSchemesProcessorInjector()
    }
}

#if MAS
protocol AppStoreRateUsDependent: ServiceDependent { var appStoreRateUs: AppStoreRateUs! { get set } }
protocol AppStoreInteractorDependent: ServiceDependent { var appStoreInteractor: AppStoreInteractor! { get set } }
#endif
