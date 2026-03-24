// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ServiceLocator.swift
//  AdguardMini
//

import Foundation
import StoreKit

import AML
import FLM
import AppStore
import class SciterSchema.SettingsCallbackService
import class SciterSchema.AccountCallbackService
import class SciterSchema.TrayCallbackService
import class SciterSchema.UserRulesCallbackService
import class SciterSchema.FiltersCallbackService
import class SciterSchema.OnboardingCallbackService

// MARK: - ServiceDependent.setupServices

extension ServiceDependent {
    func setupServices() {
        ServiceLocator.shared.injectDependencies(in: self)
    }
}

// MARK: - ServiceLocator

extension ServiceLocator {
    func injectDependencies(in client: ServiceDependent) {
        (client as? SupportDependent)?.support = self.support
        (client as? EventBusDependent)?.eventBus = self.eventBus
        (client as? AppUpdaterDependent)?.appUpdater = self.appUpdater
        (client as? AppMetadataDependent)?.appMetadata = self.appMetadata
        (client as? SentryHelperDependent)?.sentryHelper = self.sentryHelper
        (client as? RulesGrouperDependent)?.rulesGrouper = self.groupRules
        (client as? BackendServiceDependent)?.backendService = self.backendService
        (client as? ABTestsStorageDependent)?.abTestsStorage = self.abTestsStorage
        (client as? AppResetServiceDependent)?.appResetService = self.appResetService
        (client as? TelemetryServiceDependent)?.telemetryService = self.telemetryService
        (client as? SafariApiHandlerDependent)?.safariApiHandler = self.safariApiHandler
        (client as? LoginItemServiceDependent)?.loginItemService = self.loginItemService
        (client as? FiltersSupervisorDependent)?.filtersSupervisor = self.filtersSupervisor
        (client as? SystemInfoManagerDependent)?.systemInfoManager = self.coreDIContainer.systemInfoManager
        (client as? ProtectionServiceDependent)?.protectionService = self.protectionService
        (client as? StatisticsServiceDependent)?.statisticsService = self.statisticsService
        (client as? AppLifecycleServiceDependent)?.appLifecycleService = self.appLifecycleService
        (client as? ImportExportServiceDependent)?.importExportService = self.importExportService
        (client as? UserSettingsManagerDependent)?.userSettingsManager = self.userSettingsManager
        (client as? UserSettingsServiceDependent)?.userSettingsService = self.userSettingsService
        (client as? UrlSchemesProcessorDependent)?.urlSchemesProcessorInjector = { self.urlSchemesProcessor }
        (client as? SciterAppControllerDependent)?.sciterAppController = self.sciterAppController
        (client as? LicenseStateProviderDependent)?.licenseStateProvider = self.licenseStateProvider
        (client as? AppActivationObserverDependent)?.appActivationObserver = self.appActivationObserver
        (client as? SciterCallbackServiceDependent)?.sciterCallbackService = self.sciterCallbackService
        (client as? SciterOnboardingCallbackServiceDependent)?
            .sciterOnboardingCallbackService = self.sciterOnboardingCallbackService
        (client as? LegacyMigrationServiceDependent)?.legacyMigrationService = self.legacyMigrationService
        (client as? TrayIconUpdatesHandlerDependent)?.trayIconUpdatesHandler = self.appSettingUpdateHandler
        (client as? StatusBarItemControllerDependent)?.statusBarItemController = self.statusBarItemController

        (client as? SafariExtensionStateServiceDependent)?
            .safariExtensionStateService = self.safariExtensionStateService
        (client as? SafariExtensionStatusManagerDependent)?
            .safariExtensionStatusManager = self.safariExtensionStatusManager

        #if MAS
        (client as? AppStoreRateUsDependent)?.appStoreRateUs = self.appStoreRateUs
        (client as? AppStoreInteractorDependent)?.appStoreInteractor = self.appStoreInteractor
        #endif
    }
}

/// Smart ServiceLocator.
private final class ServiceLocator {
    // MARK: Services

    private let coreDIContainer: CoreDIContainer = CoreDIContainerImpl()

    private lazy var allowBlockListRuleBuilder: AllowBlockListRuleBuilder = {
        AllowBlockListRuleBuilderImpl()
    }()
    private lazy var legacyMapper: LegacyMapper = Legacy.Mapper(ruleBuilder: self.allowBlockListRuleBuilder)
    private var legacyMigrationService: LegacyMigrationService {
        Legacy.MigrationServiceImpl(
            ruleBuilder: self.allowBlockListRuleBuilder,
            appSettings: self.userSettingsService,
            sharedSettings: SharedDIContainer.shared.sharedSettingsStorage,
            filtersSupervisor: self.filtersSupervisor,
            appMetadata: self.appMetadata,
            mapper: self.legacyMapper
        )
    }

    private lazy var appMetadata: AppMetadata = AppMetadataImpl()

    #if MAS
    private lazy var appStoreRateUs: AppStoreRateUs = {
        AppStoreRateUsImpl(appMetadata: self.appMetadata)
    }()
    #endif

    private lazy var support: Support = SupportImpl(
        safariFiltersStorage: self.safariFiltersStorage,
        filtersSupervisor: self.filtersSupervisor,
        supportService: self.supportService,
        productInfo: self.productInfoStorage,
        userSettings: self.userSettingsService,
        sharedSettings: SharedDIContainer.shared.sharedSettingsStorage,
        keychain: self.coreDIContainer.keychain,
        safariExtensionStateService: self.safariExtensionStateService
    )

    private lazy var groupFolderFileService: GroupFolderFileService = GroupFolderFileServiceImpl(
        fileManager: self.coreDIContainer.fileManager
    )

    private lazy var groupRules: RulesGrouper = RulesGrouperImpl()
    private lazy var filtersConverter: FiltersConverter = FiltersConverterImpl(
        converter: self.coreDIContainer.contentBlockerConverter
    )
    private lazy var filtersUpdateModeProvider: FiltersUpdateModeProvider = {
        FiltersUpdateModeProviderImpl(
            storage: self.userSettingsManager,
            keychain: self.coreDIContainer.keychain
        )
    }()

    #if MAS
    private lazy var licenseStateProvider: LicenseStateProvider = {
        LicenseStateProviderImpl(
            keychain: self.coreDIContainer.keychain,
            appStoreInteractor: self.appStoreInteractor
        )
    }()
    #else
    private lazy var licenseStateProvider: LicenseStateProvider = {
        LicenseStateProviderImpl(keychain: self.coreDIContainer.keychain)
    }()
    #endif

    private lazy var filterListManager: FLMProtocol = {
        var defaultDbPath = ""
        if let dbPath = Bundle.main.url(
            forResource: BuildConfig.AG_STANDARD_FILTERS_DATABASE_FILENAME,
            withExtension: nil,
            subdirectory: BuildConfig.AG_DEFAULT_FILTERSDB_DIRNAME
        ) {
            defaultDbPath = dbPath.deletingLastPathComponent().path
        } else {
            LogError("The default database is missing. Try another way")
            assertionFailure("The default database is missing")
            defaultDbPath = Bundle.main.resourceURL!
                .appendingPathComponent(BuildConfig.AG_DEFAULT_FILTERSDB_DIRNAME)
                .path
        }
        return FLM(
            .init(
                kind: .standard,
                dbDirPath: self.filtersDbStorage.originDir.path,
                defaultDbDirPath: defaultDbPath,
                metadataUrl: DeveloperConfigUtils[.filtersMetaUrl] as? String ?? "https://filters.adtidy.org/extension/safari/filters.json",
                i18nURL: DeveloperConfigUtils[.filtersI18nUrl] as? String ?? "https://filters.adtidy.org/extension/safari/filters_i18n.js",
                appName: BuildConfig.AG_PRODUCT_NAME,
                version: BuildConfig.AG_MARKETING_VERSION,
                filtersCompilationPolicyConstants: ["adguard_ext_safari"]
            )
        )
    }()

    private lazy var filtersUpdateService: FiltersUpdateService = {
        FiltersUpdateServiceImpl(
            filters: self.filterListManager,
            modeProvider: self.filtersUpdateModeProvider
        )
    }()

    private lazy var filtersDbStorage: FiltersDbStorage = {
        FiltersDbStorageImpl(fileStorage: self.groupFolderFileService)
    }()

    private lazy var safariFiltersStorage: SafariFiltersStorage = {
        SafariFiltersStorageImpl(storage: SharedDIContainer.shared.filtersStorage)
    }()
    private lazy var safariExtensionManager: SafariExtensionManager = {
        SafariExtensionManagerImpl(
            delegate: self.safariExtensionStateService,
            safariPopupApiClient: self.safariPopupApiClient
        )
    }()
    private lazy var safariExtensionStateStorage: SafariExtensionStateStorage = {
        SafariExtensionStateStorageImpl()
    }()
    private lazy var safariConverter: SafariConverter = {
        SafariConverterImpl(
            groupRules: self.groupRules,
            filtersConverter: self.filtersConverter,
            storage: self.safariFiltersStorage,
            webExtension: WebExtensionDIContainer.shared.webExtension,
            userRulesId: FLM.constants.userRulesId,
            specialGroupId: FLM.constants.specialGroupId,
            resultStateObserver: self.safariExtensionStateService
        )
    }()

    // MARK: Backend endpoints

    private lazy var webFlowService: WebFlowService = WebFlowServiceImpl(productInfo: self.productInfoStorage)
    private lazy var subscribeWebFlowService: SubscribeWebFlowService = {
        SubscribeWebFlowServiceImpl(productInfo: self.productInfoStorage)
    }()

    private lazy var licenseService: LicenseService = {
        LicenseServiceImpl(
            networkManager: self.coreDIContainer.networkManager,
            systemInfoManager: self.coreDIContainer.systemInfoManager,
            productInfo: self.productInfoStorage,
            sharedSettings: SharedDIContainer.shared.sharedSettingsStorage
        )
    }()

    private lazy var supportService: SupportService = {
        SupportServiceImpl(
            networkManager: self.coreDIContainer.networkManager,
            productInfo: self.productInfoStorage
        )
    }()

    private lazy var productInfoStorage: ProductInfoStorage = {
        ProductInfoStorageImpl(keychain: self.coreDIContainer.keychain)
    }()

    private lazy var urlFilteringChecker: UrlFilteringChecker = {
        UrlFilteringCheckerImpl(urlBuilder: self.allowBlockListRuleBuilder)
    }()

    private lazy var xpcConnectionStorage: XPCConnectionStorage = XPCConnectionStorageImpl()
    private lazy var safariPopupApiClient: SafariPopupApi = {
        SafariPopupApiClient(proxyStorage: self.xpcConnectionStorage)
    }()

    private lazy var networkReachabilityMonitor: NetworkReachability = NetworkReachabilityImpl(eventBus: self.eventBus)

    private lazy var abTestsStorage: ABTests.Storage = ABTests.StorageImpl()

    private lazy var sciterAppLocator: SciterAppLocator = SciterAppLocator.shared

    // MARK: Injectable properties

    private lazy var appActivationObserver: AppActivationObserver = AppActivationObserverImpl()

    private lazy var eventBus: EventBus = EventBusImpl()

    private lazy var telemetryService: Telemetry.Service = Telemetry.ServiceImpl(
        network: self.coreDIContainer.networkManager,
        settings: self.userSettingsManager,
        abTestsStorage: self.abTestsStorage,
        appMetadata: self.appMetadata,
        licenseStateProvider: self.licenseStateProvider
    )

    private lazy var statisticsService: StatisticsService = {
        do {
            let store = try StatisticsStoreImpl()
            return StatisticsServiceImpl(store: store)
        } catch {
            LogError("Failed to initialize StatisticsStore: \(error). Using no-op implementation.")
            return NoOpStatisticsService()
        }
    }()

    private lazy var safariApiHandler: SafariApiHandler = {
        SafariApiProvider(
            proxyStorage: self.xpcConnectionStorage,
            supportService: self.support,
            filtersSupervisor: self.filtersSupervisor,
            protectionService: self.protectionService,
            safariExtensionStatusManager: self.safariExtensionStatusManager,
            urlFilteringChecker: self.urlFilteringChecker,
            userSettingsService: self.userSettingsService,
            telemetry: self.telemetryService,
            keychain: self.coreDIContainer.keychain,
            eventBus: self.eventBus,
            statisticsService: self.statisticsService,
            appStoreRateUs: {
                #if MAS
                return self.appStoreRateUs
                #else
                return nil
                #endif
            }()
        )
    }()
    private lazy var loginItemService: LoginItemService = {
        LoginItemServiceImpl(manager: self.coreDIContainer.loginItemManager)
    }()

    private lazy var appLifecycleService: AppLifecycleService = {
        AppLifecycleServiceImpl(watchdog: self.coreDIContainer.watchdogManager)
    }()

    private lazy var userSettingsManager: UserSettingsManager = UserSettings()

    private lazy var safariFiltersUpdater: SafariFiltersUpdater = SafariFiltersUpdaterImpl(
        filterListManager: self.filterListManager,
        safariConverter: self.safariConverter,
        safariFiltersStorage: self.safariFiltersStorage,
        safariExtensionManager: self.safariExtensionManager,
        userSettingsService: self.userSettingsService
    )

    private lazy var filtersSupervisor: FiltersSupervisor = {
        FiltersSupervisorImpl(
            safariFiltersStorage: self.safariFiltersStorage,
            safariFiltersUpdater: self.safariFiltersUpdater,
            filtersUpdateService: self.filtersUpdateService,
            filtersManager: self.filterListManager,
            userSettingsService: self.userSettingsService,
            eventBus: self.eventBus
        )
    }()

    private lazy var appSettingUpdateHandler: AppSettingUpdateHandler = {
        AppSettingUpdateHandlerImpl(
            appLifecycle: self.appLifecycleService,
            safariPopupApi: self.safariPopupApiClient,
            updateService: self.filtersUpdateService
        )
    }()

    private lazy var userSettingsService: UserSettingsService = {
        UserSettingsServiceImpl(
            keychain: self.coreDIContainer.keychain,
            userSettingsManager: self.userSettingsManager,
            appSettingUpdateHandler: self.appSettingUpdateHandler,
            sharedSettingsStorage: SharedDIContainer.shared.sharedSettingsStorage,
            eventBus: self.eventBus
        )
    }()

    private lazy var safariExtensionStatusManager: SafariExtensionStatusManager = {
        SafariExtensionStatusManagerImpl()
    }()

    private lazy var sciterCallbackService: SciterCallbackService = {
        SciterCallbackServiceImpl(
            settingsCallbacksGetter: self.sciterAppLocator.settingsApp.app.callback(SettingsCallbackService.self),
            accountCallbacksGetter: self.sciterAppLocator.settingsApp.app.callback(AccountCallbackService.self),
            trayCallbacksGetter: self.sciterAppLocator.trayApp.app.callback(TrayCallbackService.self),
            userRulesCallbacksGetter: self.sciterAppLocator.settingsApp.app.callback(UserRulesCallbackService.self),
            filtersCallbacksGetter: self.sciterAppLocator.settingsApp.app.callback(FiltersCallbackService.self),
            licenseStateProvider: self.licenseStateProvider,
            eventBus: self.eventBus
        )
    }()

    private lazy var sciterOnboardingCallbackService: SciterOnboardingCallbackService = {
        SciterOnboardingCallbackServiceImpl(
            onboardingCallbacksGetter: self.sciterAppLocator.onboardingApp.app.callback(OnboardingCallbackService.self),
            eventBus: self.eventBus
        )
    }()

    private lazy var importExportService: ImportExportService = ImportExportServiceImpl(
        userSettingsService: self.userSettingsService,
        filtersSupervisor: self.filtersSupervisor,
        legacyMapper: self.legacyMapper,
        eventBus: self.eventBus
    )

    private lazy var sciterAppController: SciterAppsController = {
        SciterAppsControllerImpl(
            sciterAppLocator: self.sciterAppLocator,
            sciterCallbackService: self.sciterCallbackService,
            sciterOnboardingCallbackService: self.sciterOnboardingCallbackService,
            protectionService: self.protectionService
        )
    }()

    private lazy var safariExtensionStateService: SafariExtensionStateService = {
        SafariExtensionStateServiceImpl(
            eventBus: self.eventBus,
            safariExtensionStatusManager: self.safariExtensionStatusManager,
            safariExtensionStateStorage: self.safariExtensionStateStorage
        )
    }()

    private lazy var backendService: BackendService = BackendServiceImpl(
        webFlowService: self.webFlowService,
        subscribeWebFlowService: self.subscribeWebFlowService,
        licenseService: self.licenseService,
        productInfo: self.productInfoStorage,
        keychain: self.coreDIContainer.keychain,
        netReachability: self.networkReachabilityMonitor,
        eventBus: self.eventBus
    )

    #if MAS

    private lazy var appStore: StoreApiProtocol = {
        StoreApi(subscriptionIds: Set(AppStore.Subscription.allCases.map(\.productId)))
    }()

    private lazy var appStoreInteractor: AppStoreInteractor = AppStoreInteractorImpl(
        appStore: self.appStore,
        backendService: self.backendService
    )

    #endif

    private lazy var statusBarItemController: StatusBarItemController = {
        StatusBarItemControllerImpl(storage: SharedDIContainer.shared.sharedSettingsStorage)
    }()

    private lazy var urlSchemesProcessor: UrlSchemesProcessor = {
        UrlSchemesProcessorImpl(
            appLifecycleService: self.appLifecycleService,
            backendService: self.backendService,
            sciterAppController: self.sciterAppController,
            userSettings: self.userSettingsManager,
            eventBus: self.eventBus
        )
    }()

    private lazy var appResetService: AppResetService = {
        AppResetServiceImpl(
            self.appLifecycleService,
            SharedDIContainer.shared.sharedSettingsStorage,
            self.filtersSupervisor,
            self.userSettingsService,
            self.serviceSupervisor,
            self.statisticsService
        )
    }()

    private lazy var sentryHelper: SentryHelper = {
        SentryHelperImpl(appMetadata: self.appMetadata, appResetService: self.appResetService)
    }()

    private lazy var serviceSupervisor: ServiceSupervisor = {
        ServiceSupervisorImpl(
            filtersSupervisor: self.filtersSupervisor
        )
    }()

    private lazy var protectionService: ProtectionService = {
        ProtectionServiceImpl(
            serviceSupervisor: self.serviceSupervisor,
            safariExtensionManager: self.safariExtensionManager,
            sharedSettingsStorage: SharedDIContainer.shared.sharedSettingsStorage,
            statusBarItemController: self.statusBarItemController,
            appMetadata: self.appMetadata
        )
    }()

    private lazy var appUpdater: AppUpdater = {
        AppUpdaterImpl(
            eventBus: self.eventBus
        )
    }()

    // MARK: Singleton

    static let shared: ServiceLocator = ServiceLocator()

    private init() {}
}
