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
// Generated service base types (`ThemeService`, `AccountService`, etc.)
// Are provided by the local `ProtoSchema` SPM package. Concrete
// `<Name>ServiceImpl` classes live in the app target and conform to
// `<Name>Service.ServiceType`.
import ProtoSchema
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
        (client as? BackendServiceDependent)?.backendService = self.backendService
        (client as? ABTestsStorageDependent)?.abTestsStorage = self.abTestsStorage
        (client as? AppResetServiceDependent)?.appResetService = self.appResetService
        (client as? TelemetryServiceDependent)?.telemetryService = self.telemetryService
        (client as? SafariApiHandlerDependent)?.safariApiHandler = self.safariApiHandler
        (client as? LoginItemServiceDependent)?.loginItemService = self.loginItemService
        (client as? URLFilterServiceDependent)?.urlFilterService = self.urlFilterService
        (client as? FiltersSupervisorDependent)?.filtersSupervisor = self.filtersSupervisor
        (client as? MailFiltersUpdaterDependent)?.mailFiltersUpdater = self.mailFiltersUpdater
        (client as? SystemInfoManagerDependent)?.systemInfoManager = self.coreDIContainer.systemInfoManager
        (client as? ProtectionServiceDependent)?.protectionService = self.protectionService
        (client as? StatisticsServiceDependent)?.statisticsService = self.statisticsService
        (client as? AppLifecycleServiceDependent)?.appLifecycleService = self.appLifecycleService
        (client as? ImportExportServiceDependent)?.importExportService = self.importExportService
        (client as? UserSettingsManagerDependent)?.userSettingsManager = self.userSettingsManager
        (client as? UserSettingsServiceDependent)?.userSettingsService = self.userSettingsService
        (client as? UrlSchemesProcessorDependent)?.urlSchemesProcessorInjector = { self.urlSchemesProcessor }
        (client as? LicenseStateProviderDependent)?.licenseStateProvider = self.licenseStateProvider
        (client as? AppActivationObserverDependent)?.appActivationObserver = self.appActivationObserver
        (client as? URLFilterStateAssemblerDependent)?.urlFilterStateAssembler = self.urlFilterStateAssembler
        (client as? LegacyMigrationServiceDependent)?.legacyMigrationService = self.legacyMigrationService
        (client as? TrayIconUpdatesHandlerDependent)?.trayIconUpdatesHandler = self.appSettingUpdateHandler
        (client as? StatusBarItemControllerDependent)?.statusBarItemController = self.statusBarItemController
        (client as? WebViewAppsControllerDependent)?.webViewAppsController = self.webViewAppsController
        (client as? TrayWindowControllerDependent)?.trayWindowController = self.trayWindowController

        (client as? SafariExtensionStateServiceDependent)?
            .safariExtensionStateService = self.safariExtensionStateService
        (client as? SafariExtensionStatusManagerDependent)?
            .safariExtensionStatusManager = self.safariExtensionStatusManager
        (client as? HealthCheckAttentionProviderDependent)?
            .healthCheckAttentionProvider = self.healthCheckAttentionProvider

        #if MAS
        (client as? AppStoreRateUsDependent)?.appStoreRateUs = self.appStoreRateUs
        (client as? AppStoreInteractorDependent)?.appStoreInteractor = self.appStoreInteractor
        #endif
    }
}

// MARK: - WKWebView bridge service accessors
//
// Computed properties referenced by AppDelegate's host factory. Each
// Lazily creates a service instance via the Sciter SDK's
// `<Name>ServiceImpl` factory. After Task 13 regenerates the codegen
// To drop the `sciterCall` fallback, these will point to directly-
// Extended service implementations.

extension ServiceLocator {
    var themeService: ThemeService.ServiceType { self._themeService }
    var traySettingsService: TraySettingsService.ServiceType { self._traySettingsService }
    var accountService: AccountService.ServiceType { self._accountService }
    var safariExtensionsService: SafariExtensionsService.ServiceType { self._safariExtensionsService }
    var advancedBlockingService: AdvancedBlockingService.ServiceType { self._advancedBlockingService }
    var appUpdateService: AppUpdateService.ServiceType { self._appUpdateService }
    // Name `telemetryBridgeService` to avoid the type collision with
    // `ServiceLocator`'s `.telemetryService` (`Telemetry.Service` vs
    // `TelemetryService.ServiceType`).
    var telemetryBridgeService: TelemetryService.ServiceType { self._telemetryBridgeService }
    var settingsService: SettingsService.ServiceType { self._settingsService }
    var appInfoService: AppInfoService.ServiceType { self._appInfoService }
    var filtersService: FiltersService.ServiceType { self._filtersService }
    var userRulesService: UserRulesService.ServiceType { self._userRulesService }
    var onboardingService: OnboardingService.ServiceType { self._onboardingService }
    var consentService: ConsentService.ServiceType { self._consentService }
    var internalService: InternalService.ServiceType { self._internalService }
    var systemService: SystemService.ServiceType { self._systemService }
}

/// Smart ServiceLocator.
final class ServiceLocator {
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
        AppStoreRateUsImpl(
            appMetadata: self.appMetadata,
            statisticsService: self.statisticsService
        )
    }()
    #endif

    private lazy var mailExtensionStateService: MailExtensionStateService = {
        MailExtensionStateServiceImpl(
            storage: MailExtensionStateStorageImpl()
        )
    }()

    private lazy var support: Support = SupportImpl(
        safariFiltersStorage: self.safariFiltersStorage,
        filtersStorage: SharedDIContainer.shared.filtersStorage,
        filtersSupervisor: self.filtersSupervisor,
        supportService: self.supportService,
        productInfo: self.productInfoStorage,
        userSettings: self.userSettingsService,
        sharedSettings: SharedDIContainer.shared.sharedSettingsStorage,
        keychain: self.coreDIContainer.keychain,
        safariExtensionStateService: self.safariExtensionStateService,
        mailExtensionStateService: self.mailExtensionStateService
    )

    private lazy var groupFolderFileService: GroupFolderFileService = GroupFolderFileServiceImpl(
        fileManager: self.coreDIContainer.fileManager
    )

    private lazy var filtersConverter: FiltersConverter = FiltersConverterImpl(
        converter: self.coreDIContainer.contentBlockerConverter
    )

    // `MailRulesetStorageAdapter` wraps the shared `FiltersStorage`.
    // The writer path matches the log-export reader and `MailBlocker` reader.
    private lazy var mailRulesetConverter: MailRulesetConverting = MailRulesetConverter(
        converter: self.filtersConverter,
        storage: MailRulesetStorageAdapter(storage: SharedDIContainer.shared.filtersStorage)
    )

    private lazy var mailRuleProvider: MailRuleProvider = MailRuleProviderImpl(
        filterListManager: self.filterListManager
    )

    private lazy var mailPremiumStatusProvider: MailPremiumStatusProvider = MailPremiumStatusProviderImpl(
        keychain: self.coreDIContainer.keychain
    )

    private lazy var mailExtensionReloader: MailExtensionReloader = MailExtensionReloaderImpl()

    private lazy var mailFiltersUpdater: MailFiltersUpdater = MailFiltersUpdaterNoOp()
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
            appStoreInteractor: self.appStoreInteractor,
            eventBus: self.eventBus
        )
    }()
    #else
    private lazy var licenseStateProvider: LicenseStateProvider = {
        LicenseStateProviderImpl(
            keychain: self.coreDIContainer.keychain,
            backendService: self.backendService
        )
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
                version: BuildConfig.AG_VERSION_TITLE,
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

    // MARK: - WKWebView bridge services

    // Services registered on `WKWebViewBridge` instances by `AppDelegate`'s
    // Host factory. Concrete `<Name>ServiceImpl` classes live in the app target
    // `Sources/WebView/Services/` and conform to `<Name>Service.ServiceType`.

    private lazy var _themeService: ThemeService.ServiceType = ThemeServiceImpl()
    private lazy var _traySettingsService: TraySettingsService.ServiceType = TraySettingsServiceImpl()
    private lazy var _accountService: AccountService.ServiceType = AccountServiceImpl()
    private lazy var _safariExtensionsService
        = SafariExtensionsServiceImpl() as SafariExtensionsService.ServiceType
    private lazy var _advancedBlockingService
        = AdvancedBlockingServiceImpl() as AdvancedBlockingService.ServiceType
    private lazy var _appUpdateService: AppUpdateService.ServiceType = AppUpdateServiceImpl()
    private lazy var _telemetryBridgeService: TelemetryService.ServiceType = TelemetryServiceImpl()
    private lazy var _settingsService: SettingsService.ServiceType = SettingsServiceImpl()
    private lazy var _appInfoService: AppInfoService.ServiceType = AppInfoServiceImpl()
    private lazy var _filtersService: FiltersService.ServiceType = FiltersServiceImpl()
    private lazy var _userRulesService: UserRulesService.ServiceType = UserRulesServiceImpl()
    private lazy var _onboardingService: OnboardingService.ServiceType = OnboardingServiceImpl()
    private lazy var _consentService: ConsentService.ServiceType = ConsentServiceImpl()
    private lazy var _internalService: InternalService.ServiceType = InternalServiceImpl()
    private lazy var _systemService: SystemService.ServiceType = SystemServiceImpl()

    /// Set by `AppDelegate` after the `WebViewAppsController` is created from
    /// `AppDelegate.init()`. Injected into DI clients via
    /// `ServiceLocator.shared.injectDependencies` per the `WebViewAppsControllerDependent`
    /// protocol at `WKWebViewAppLocator.swift:34-36`.
    var webViewAppsController: WebViewAppsController!

    /// Set by `AppDelegate.applicationDidFinishLaunching` right after the
    /// Tray window controller is created. `SystemService` is registered on
    /// Both the tray and settings hosts, so any host creation triggers
    /// `SystemServiceImpl` initialization; this property must be set before
    /// The first such host is built.
    var trayWindowController: WebViewTrayWindowController!

    // MARK: Injectable properties

    private lazy var appActivationObserver: AppActivationObserver = AppActivationObserverImpl()

    private lazy var eventBus: EventBus = EventBusImpl()

    private lazy var sharedKeychainStorage: SharedKeychainStorage = SharedKeychainStorageImpl()

    private lazy var urlFilterService: URLFilterService = {
        if #available(macOS 26, *) {
            return URLFilterServiceLiveImpl(
                eventBus: self.eventBus,
                sharedKeychainStorage: self.sharedKeychainStorage
            )
        }
        return URLFilterServiceNoOp()
    }()

    private lazy var urlFilterBloomMetadataStorage: URLFilterBloomMetadataStorage =
        URLFilterBloomMetadataStorageImpl()

    private lazy var urlFilterStateAssembler: URLFilterStateAssembler = {
        URLFilterStateAssembler(
            urlFilterService: self.urlFilterService,
            protectionLevelProvider: { [userSettingsService = self.userSettingsService] in
                userSettingsService.urlFilterProtectionLevel
            },
            isNewProvider: { [userSettingsService = self.userSettingsService] in
                userSettingsService.urlFilterIsNew
            },
            bloomMetadataProvider: { [bloomMetadataStorage = self.urlFilterBloomMetadataStorage] in
                bloomMetadataStorage.load()
            }
        )
    }()

    private lazy var urlFilterResetService: URLFilterResetService = URLFilterResetServiceImpl(
        self.urlFilterService,
        self.sharedKeychainStorage,
        self.urlFilterBloomMetadataStorage,
        self.groupFolderFileService,
        self.urlFilterStateAssembler
    )

    private lazy var telemetryService: Telemetry.Service = Telemetry.ServiceImpl(
        network: self.coreDIContainer.networkManager,
        settings: self.userSettingsManager,
        abTestsStorage: self.abTestsStorage,
        appMetadata: self.appMetadata,
        licenseStateProvider: self.licenseStateProvider
    )

    private lazy var statisticsService: StatisticsService = {
        do {
            let store = try SharedStatisticsStoreImpl()
            return StatisticsServiceImpl(
                store: store,
                sharedSettings: SharedDIContainer.shared.sharedSettingsStorage
            )
        } catch {
            LogError("Failed to initialize SharedStatisticsStore: \(error). Using no-op implementation.")
            return NoOpStatisticsService()
        }
    }()

    private lazy var safariApiHandler: SafariApiHandler = {
        SafariApiProvider(
            proxyStorage: self.xpcConnectionStorage,
            licenseStateProvider: self.licenseStateProvider,
            supportService: self.support,
            filtersSupervisor: self.filtersSupervisor,
            protectionService: self.protectionService,
            safariExtensionStatusManager: self.safariExtensionStatusManager,
            urlFilteringChecker: self.urlFilteringChecker,
            userSettingsService: self.userSettingsService,
            telemetry: self.telemetryService,
            keychain: self.coreDIContainer.keychain,
            eventBus: self.eventBus,
            healthCheckAttentionProvider: self.healthCheckAttentionProvider,
            backendService: {
                #if MAS
                return self.backendService
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
            eventBus: self.eventBus,
            mailFiltersUpdater: self.mailFiltersUpdater
        )
    }()

    private lazy var appSettingUpdateHandler: AppSettingUpdateHandler = {
        AppSettingUpdateHandlerImpl(
            appLifecycle: self.appLifecycleService,
            safariPopupApi: self.safariPopupApiClient,
            updateService: self.filtersUpdateService,
            mailFiltersUpdater: self.mailFiltersUpdater
        )
    }()

    private lazy var userSettingsService: UserSettingsService = {
        UserSettingsServiceImpl(
            keychain: self.coreDIContainer.keychain,
            userSettingsManager: self.userSettingsManager,
            appSettingUpdateHandler: self.appSettingUpdateHandler,
            sharedSettingsStorage: SharedDIContainer.shared.sharedSettingsStorage,
            sharedKeychainStorage: self.sharedKeychainStorage,
            eventBus: self.eventBus,
            mailFiltersUpdater: self.mailFiltersUpdater
        )
    }()

    private lazy var safariExtensionStatusManager: SafariExtensionStatusManager = {
        SafariExtensionStatusManagerImpl()
    }()

    private lazy var healthCheckAttentionProvider: HealthCheckAttentionProvider = {
        HealthCheckAttentionProviderImpl(
            safariExtensionStatusManager: self.safariExtensionStatusManager,
            safariExtensionStateService: self.safariExtensionStateService,
            loginItemManager: self.coreDIContainer.loginItemManager,
            userSettingsService: self.userSettingsService,
            filtersSupervisor: self.filtersSupervisor
        )
    }()

    private lazy var importExportService: ImportExportService = ImportExportServiceImpl(
        userSettingsService: self.userSettingsService,
        filtersSupervisor: self.filtersSupervisor,
        legacyMapper: self.legacyMapper,
        eventBus: self.eventBus
    )

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
        backendService: self.backendService,
        eventBus: self.eventBus
    )

    #endif

    private lazy var statusBarItemController: StatusBarItemController = {
        StatusBarItemControllerImpl(
            storage: SharedDIContainer.shared.sharedSettingsStorage,
            userSettingsManager: self.userSettingsManager
        )
    }()

    private lazy var urlSchemesProcessor: UrlSchemesProcessor = {
        UrlSchemesProcessorImpl(
            appLifecycleService: self.appLifecycleService,
            backendService: self.backendService,
            webViewAppsController: self.webViewAppsController,
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
            self.urlFilterResetService
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
