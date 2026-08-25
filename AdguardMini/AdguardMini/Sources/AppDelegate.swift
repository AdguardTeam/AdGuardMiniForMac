// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppDelegate.swift
//  AdguardMini
//

import Cocoa
import ServiceManagement
import WebKit

import AML
import CoreGraphics
import ProtoSchema

// MARK: - AppDelegate

extension AppDelegate:
    AppMetadataDependent,
    AppLifecycleServiceDependent,
    SafariApiHandlerDependent,
    LoginItemServiceDependent,
    UrlSchemesProcessorDependent,
    WebViewAppsControllerDependent,
    StatusBarItemControllerDependent,
    BackendServiceDependent,
    TelemetryServiceDependent,
    EventBusDependent,
    ProtectionServiceDependent,
    UserSettingsManagerDependent,
    SentryHelperDependent,
    LegacyMigrationServiceDependent,
    LicenseStateProviderDependent,
    URLFilterServiceDependent,
    URLFilterStateAssemblerDependent {}

#if MAS
extension AppDelegate: AppStoreRateUsDependent {}
#endif

final class AppDelegate: NSObject, NSApplicationDelegate {
    // MARK: Internal services

    var appMetadata: AppMetadata!
    var safariApiHandler: SafariApiHandler!
    var loginItemService: LoginItemService!
    var urlSchemesProcessorInjector: (() -> any UrlSchemesProcessor)!
    var webViewAppsController: WebViewAppsController!
    var appLifecycleService: AppLifecycleService!
    var statusBarItemController: StatusBarItemController!
    var backendService: BackendService!
    var telemetryService: Telemetry.Service!
    var eventBus: EventBus!
    var protectionService: ProtectionService!
    var userSettingsManager: UserSettingsManager!
    var legacyMigrationService: LegacyMigrationService!
    var sentryHelper: SentryHelper!
    var licenseStateProvider: LicenseStateProvider!
    var urlFilterService: URLFilterService!
    var urlFilterStateAssembler: URLFilterStateAssembler!

    #if MAS
    var appStoreRateUs: AppStoreRateUs!
    #endif

    // MARK: Private properties

    private let metricKitSubscriber: MetricKitSubscriber = MetricKitSubscriberImpl()
    private var performQuit = false
    private var firstExitTry: Bool = true
    private var readyToTerminate: Bool = false

    private var migrationSuccess: Bool = false
    private var trayWindowController: WebViewTrayWindowController?
    private var webViewCallbackCoordinator: WebViewCallbackCoordinator?
    private var effectiveThemeObserver: Any!
    private var isWaitingForWake: Bool = false
    private var pendingStartStep1Remainder: (() -> Void)?

    // MARK: Public

    // The initializer wires the full WKWebView host factory graph, so it
    // Exceeds the 70-line body limit by design.
    // swiftlint:disable:next function_body_length
    override init() {
        super.init()
        self.setupServices()
        self.webViewCallbackCoordinator = WebViewCallbackCoordinator(
            eventBus: self.eventBus,
            licenseStateProvider: self.licenseStateProvider,
            urlFilterStateAssembler: self.urlFilterStateAssembler
        )
        // Per-module capability set (message handlers + bridge services) is
        // Documented in `ModuleCapabilities`; this factory registers them.
        self.webViewAppsController = WebViewAppsController(
            hostFactory: { module in
                switch module {
                case .tray:
                    let locator = ServiceLocator.shared
                    let trayCallbackService = WKWebViewAppResolver.trayCallbackService
                    return self.makeWebViewAppHostProduction(
                        module: .tray,
                        onVisibilityChange: { [weak self] visible in
                            // Fires the recovery sequence via the bridge — ungated.
                            trayCallbackService.onTrayWindowVisibilityChange(BoolValue(visible))
                            if !visible {
                                Task { @MainActor in
                                    await self?.trayWindowController?.restoreTrayIconVisibilityIfNeeded()
                                }
                            }
                        },
                        bridgeSetup: { bridge in
                            bridge.register(service: locator.themeService, serviceName: "ThemeService")
                            bridge.register(service: locator.traySettingsService, serviceName: "TraySettingsService")
                            bridge.register(service: locator.accountService, serviceName: "AccountService")
                            bridge.register(
                                service: locator.safariExtensionsService,
                                serviceName: "SafariExtensionsService"
                            )
                            bridge.register(
                                service: locator.advancedBlockingService,
                                serviceName: "AdvancedBlockingService"
                            )
                            bridge.register(service: locator.appUpdateService, serviceName: "AppUpdateService")
                            bridge.register(service: locator.telemetryBridgeService, serviceName: "TelemetryService")
                            bridge.register(service: locator.internalService, serviceName: "InternalService")
                            bridge.register(service: locator.systemService, serviceName: "SystemService")
                            bridge.register(service: locator.consentService, serviceName: "ConsentService")
                            bridge.register(service: locator.filtersService, serviceName: "FiltersService")
                            trayCallbackService.attach(webViewBridge: bridge)
                        },
                        extraMessageHandlersSetup: nil
                    )
                case .settings:
                    let locator = ServiceLocator.shared
                    let settingsCallbackService = WKWebViewAppResolver.settingsCallbackService
                    let userRulesCallbackService = WKWebViewAppResolver.userRulesCallbackService
                    let accountCallbackService = WKWebViewAppResolver.accountCallbackService
                    let filtersCallbackService = WKWebViewAppResolver.filtersCallbackService
                    return self.makeWebViewAppHostProduction(
                        module: .settings,
                        onVisibilityChange: { visible in
                            // Visibility-recovery trigger — deferred to
                            // `didFinishNavigation()` via the host's
                            // `pendingVisibilityChange` flag when the page is
                            // Still `.loading`. Fires `OnWindowDidBecomeMain`
                            // → TS recovery sequence.
                            if visible {
                                settingsCallbackService.onWindowDidBecomeMain(EmptyValue())

                                #if MAS
                                // Port of the Sciter `SettingsApp.showWindow`
                                // Rate-us trigger (AG-57130): the prompt is
                                // Shown only after a debounce and only if the
                                // Settings window is still visible and the app
                                // Is active.
                                self.appStoreRateUs.onWindowOpened { [weak self] in
                                    guard let self,
                                          let settingsWindow = self.webViewAppsController
                                              .host(for: .settings)?.window else {
                                        return false
                                    }
                                    return settingsWindow.occlusionState.contains(.visible)
                                        && NSApplication.shared.isActive
                                }
                                #endif
                            }
                        },
                        bridgeSetup: { bridge in
                            bridge.register(service: locator.themeService, serviceName: "ThemeService")
                            bridge.register(service: locator.accountService, serviceName: "AccountService")
                            bridge.register(
                                service: locator.safariExtensionsService,
                                serviceName: "SafariExtensionsService"
                            )
                            bridge.register(
                                service: locator.advancedBlockingService,
                                serviceName: "AdvancedBlockingService"
                            )
                            bridge.register(service: locator.appUpdateService, serviceName: "AppUpdateService")
                            bridge.register(service: locator.settingsService, serviceName: "SettingsService")
                            bridge.register(service: locator.filtersService, serviceName: "FiltersService")
                            bridge.register(service: locator.appInfoService, serviceName: "AppInfoService")
                            bridge.register(service: locator.userRulesService, serviceName: "UserRulesService")
                            bridge.register(service: locator.internalService, serviceName: "InternalService")
                            bridge.register(service: locator.systemService, serviceName: "SystemService")
                            bridge.register(service: locator.consentService, serviceName: "ConsentService")
                            bridge.register(service: locator.telemetryBridgeService, serviceName: "TelemetryService")
                            settingsCallbackService.attach(webViewBridge: bridge)
                            userRulesCallbackService.attach(webViewBridge: bridge)
                            // `WebViewCallbackCoordinator` pushes the license
                            // Update and the three filter updates through these
                            // Two services. Without the attach their `bridge`
                            // Stays nil and every such push is dropped, even
                            // Though `webViewSettingsBootstrap` already
                            // Registers all four handlers on the TS side.
                            accountCallbackService.attach(webViewBridge: bridge)
                            filtersCallbackService.attach(webViewBridge: bridge)
                        },
                        extraMessageHandlersSetup: nil
                    )
                case .onboarding:
                    let locator = ServiceLocator.shared
                    let onboardingCallbackService = WKWebViewAppResolver.onboardingCallbackService
                    let userSettingsManager = self.userSettingsManager!
                    return self.makeWebViewAppHostProduction(
                        module: .onboarding,
                        onVisibilityChange: { visible in
                            // Recovery path — re-deliver the current effective
                            // Theme via the bridge push on reopen. Mirrors
                            // The Settings' `onWindowDidBecomeMain` pattern
                            // Adapted to onboarding (which has no
                            // `OnWindowDidBecomeMain` callback — only
                            // `OnEffectiveThemeChanged`). Deferred via the
                            // Host's `pendingVisibilityChange` flag so the
                            // Recovery sequence is NOT lost on first show.
                            if visible {
                                onboardingCallbackService.onEffectiveThemeChanged(
                                    EffectiveThemeValue.resolve(userSettingsManager.theme)
                                )
                            }
                        },
                        bridgeSetup: { bridge in
                            bridge.register(service: locator.themeService, serviceName: "ThemeService")
                            bridge.register(
                                service: locator.onboardingService,
                                serviceName: "OnboardingService"
                            )
                            bridge.register(
                                service: locator.consentService,
                                serviceName: "ConsentService"
                            )
                            bridge.register(
                                service: locator.safariExtensionsService,
                                serviceName: "SafariExtensionsService"
                            )
                            bridge.register(
                                service: locator.filtersService,
                                serviceName: "FiltersService"
                            )
                            bridge.register(
                                service: locator.appUpdateService,
                                serviceName: "AppUpdateService"
                            )
                            bridge.register(
                                service: locator.telemetryBridgeService,
                                serviceName: "TelemetryService"
                            )
                            bridge.register(
                                service: locator.internalService,
                                serviceName: "InternalService"
                            )
                            onboardingCallbackService.attach(webViewBridge: bridge)
                        },
                        extraMessageHandlersSetup: nil
                    )
                case .userrules:
                    // The user-rules editor child host.
                    let locator = ServiceLocator.shared
                    let userRulesEditorCallbackService = WKWebViewAppResolver.userRulesEditorCallbackService
                    let settingsEditorCallbackService = WKWebViewAppResolver.settingsEditorCallbackService
                    return self.makeWebViewAppHostProduction(
                        module: .userrules,
                        onVisibilityChange: nil,
                        bridgeSetup: { bridge in
                            bridge.register(service: locator.themeService, serviceName: "ThemeService")
                            bridge.register(service: locator.userRulesService, serviceName: "UserRulesService")
                            bridge.register(service: locator.internalService, serviceName: "InternalService")
                            bridge.register(
                                service: locator.telemetryBridgeService,
                                serviceName: "TelemetryService"
                            )
                            userRulesEditorCallbackService.attach(webViewBridge: bridge)
                            settingsEditorCallbackService.attach(webViewBridge: bridge)
                        },
                        extraMessageHandlersSetup: nil
                    )
                }
            },
            onChildWindowClosed: { _ in
                WKWebViewAppResolver.userRulesCallbackService.onUserRulesWindowClosed(EmptyValue())
            }
        )
        // Publish the controller to `ServiceLocator` so DI clients
        // (such as `InternalServiceImpl`, `OnboardingServiceImpl`) receive
        // It via `WebViewAppsControllerDependent` injection. Mirror of the
        // `sciterAppController` lazy-var pattern — transitional; removed
        // In the Sciter→WKWebView migration cutover.
        ServiceLocator.shared.webViewAppsController = self.webViewAppsController
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        LogInfo("Did finish launching with notification: \(notification)")

        if !self.checkAppLocation() {
#if !DEBUG
            NSApplication.shared.terminate(self)
            return
#endif
        }

        LogInfo("Application Started! Version: \(BuildConfig.AG_VERSION_TITLE)")

        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(systemDidWake(_:)),
            name: NSWorkspace.didWakeNotification,
            object: nil
        )
        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(screensDidWake(_:)),
            name: NSWorkspace.screensDidWakeNotification,
            object: nil
        )

        self.sentryHelper.onEndStart = { [weak self] in
            self?.startAppStep0()
        }
        self.sentryHelper.startSentryAndContinueStartUp()

        // Tray WKWebView host — unconditionally starts at launch.
        // Stored on `self` (not a local) so it outlives `start()`: the
        // Status-bar button's click target is `StatusBarItemControllerImpl`,
        // Whose `delegate` is a `weak` reference back to this controller.
        // A non-retained local would be deallocated after `start()` returns,
        // Nilling the weak delegate and silently dropping every tray click.
        self.trayWindowController = WebViewTrayWindowController(
            webViewAppsController: self.webViewAppsController,
            statusBarItemController: self.statusBarItemController
        )
        Task { @MainActor in await self.trayWindowController?.start() }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        LogDebugTrace()
        if flag {
            return true
        }

        // Since macOS 15, activation from the Dock can switch the policy to
        // `.regular`. Restore the accessory policy to prevent a stuck Dock icon.
        // This keeps the app running quietly from the menu bar.
        if NSApplication.shared.activationPolicy() == .regular && !UIUtils.hasOpenedWindows {
            UIUtils.setActivationPolicy(.accessory)
        }

        if self.userSettingsManager.firstRun {
            self.webViewAppsController.show(.onboarding)
        } else {
            Task { @MainActor in
                await self.trayWindowController?.showTrayWindow()
            }
        }

        return false
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        LogDebugTrace()
        self.urlSchemesProcessor.processUrls(urls)
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        guard !self.userSettingsManager.firstRun else {
            return .terminateNow
        }

        if !self.protectionService.isProtectionEnabled
            || self.readyToTerminate
            || (!self.performQuit && !self.isAppQuittingViaDock()) {
            return .terminateNow
        }

        self.performQuit = false

        Task { @MainActor in
            self.webViewAppsController.hide(.tray)

            guard await self.shouldProcessQuit() else {
                return
            }

            let alert = await AppAlert.quitApp()

            let result = await alert.show()

            if let suppressionButton = alert.suppressionButton,
               suppressionButton.state == .on {
                switch result {
                case .alertFirstButtonReturn:
                    self.userSettingsManager.quitReaction = .keepRunning
                case .alertSecondButtonReturn:
                    self.userSettingsManager.quitReaction = .quit
                default:
                    break
                }
            }

            if result == .alertSecondButtonReturn {
                self.terminate()
            }

            self.webViewAppsController.hide(.settings)
        }

        return .terminateCancel
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        // During first run the app quits when the onboarding window (its only
        // Window) closes. But AppKit also consults this method whenever the
        // App's last window closes, including transient startup windows such
        // As the `checkAppLocation()` alert, which closes before the
        // Onboarding host is created. Guarding on the host's existence
        // Prevents a startup-only window closing from killing the app before
        // The onboarding window appears.
        self.userSettingsManager.firstRun
            && self.webViewAppsController.host(for: .onboarding) != nil
    }

    func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool {
        false
    }

    /// Performs Quit from App (user selected).
    func performAppQuit() {
        self.performQuit = true
        NSApplication.shared.terminate(self)
    }

    private func startAppStep0() {
        Task { @MainActor in
            LogInfo("Start App Step 0")

            self.metricKitSubscriber.start()

            do {
                self.migrationSuccess = try await self.legacyMigrationService.tryMigrate()
            } catch {
                LogError("Could not migrate: \(error)")
            }

            let firstStartDate = self.appMetadata.firstStartDate
            if firstStartDate.isNil {
                let isStartDateNow = self.userSettingsManager.firstRun && !self.migrationSuccess
                self.appMetadata.firstStartDate = isStartDateNow ? .now : .distantPast
            }

            await self.backendService.bootstrap()
            await self.urlFilterService.start()

            await self.startAppStep1()
        }
    }

    @MainActor
    private func startAppStep1() async {
        LogInfo("Start App Step 1")

        self.userSettingsManager.registerUserDefaults(SettingsKey.asDict)

        let isPaid = await self.backendService.getStoredAppStatusInfo()?.isPaid ?? false
        if self.userSettingsManager.firstRun && isPaid {
            self.userSettingsManager.adguardExtra = true
            self.userSettingsManager.realTimeFiltersUpdate = true
        }

        await VersionedMigration.run(
            storage: VersionedMigrationStorageImpl(),
            firstRun: self.userSettingsManager.firstRun
        )

        await self.telemetryService.startSession()

        if !self.isDisplayReady() {
            self.isWaitingForWake = true
            self.pendingStartStep1Remainder = { [weak self] in
                self?.continueStartAppStep1()
            }
            return
        }

        self.continueStartAppStep1()
    }

    private func continueStartAppStep1() {
        NSApplication.shared.mainMenu = AppMenu()

        // `UIUtils` stores the desired activation policy internally.
        // It restores `.accessory` in `removeWindow` once the last window closes.
        // The app returns to the menu bar, so its Dock icon is not left behind.
        UIUtils.setActivationPolicy(.accessory)

        // The KVO handler fires on an arbitrary thread.
        // NotificationCenter delivers synchronously on the posting thread.
        // Downstream observers drive the main-thread-only WKWebView
        // `evaluateJavaScript`, so the post MUST run on the main actor.
        self.effectiveThemeObserver = NSApplication.shared.observe(\.effectiveAppearance) { _, _ in
            Task { @MainActor in
                let userTheme = self.userSettingsManager.theme
                self.eventBus.post(event: .effectiveThemeChanged, userInfo: userTheme)
            }
        }

        Task { @MainActor in
            await self.startAppStep2()

            self.checkLoginItem()
        }
    }

    private func isDisplayReady() -> Bool {
        var displays = [CGDirectDisplayID](repeating: 0, count: 8)
        var count: UInt32 = 0
        let err = CGGetActiveDisplayList(UInt32(displays.count), &displays, &count)

        if err != .success || count == 0 {
            return false
        }

        guard let screen = NSScreen.main ?? NSScreen.screens.first else {
            return false
        }

        let scale = screen.backingScaleFactor
        if scale <= 0 {
            return false
        }

        let frame = screen.frame
        if frame.width <= 0 || frame.height <= 0 {
            return false
        }

        return true
    }

    @MainActor
    private func startAppStep2() async {
        LogInfo("Start App Step 2")
        if self.userSettingsManager.firstRun && !self.migrationSuccess {
            self.webViewAppsController.show(.onboarding)
        } else {
            if self.userSettingsManager.firstRun {
                self.userSettingsManager.firstRun.toggle()
                // First run with a successful legacy migration: onboarding
                // Is skipped, so the tray icon (hidden while `firstRun` was
                // True) must be shown now.
                await self.statusBarItemController.updateStatusBarIcon()
            }
            // Pre-warm the tray host (load its HTML) but keep the window
            // Hidden: a menu-bar popover must only appear on click, not at
            // Launch. Previously `show(.tray)` here flashed the window then
            // Relied on a spurious `didResignKey` to hide it.
            self.webViewAppsController.prepareHost(for: .tray)

            // Starts the filter machinery: `ServiceSupervisor.startAll()` ->
            // `FiltersSupervisor.start()` (Safari and mail filter updaters, update timer).
            // Main path only, as before the cutover — the onboarding path starts
            // Protection when onboarding completes.
            await self.protectionService.startIfEnabled()

            if self.migrationSuccess {
                self.webViewAppsController.show(.settings)
                self.eventBus.post(event: .settingsPageRequested, userInfo: "migration")
            }
        }
        let theme = self.userSettingsManager.theme
        await NSApplication.shared.setTheme(theme)
    }

    /// Checks that the app bundle is located under /Applications
    /// - Returns: `true` if the app is in the expected location, `false` otherwise.
    private func checkAppLocation() -> Bool {
        LogDebug("Starting app location check")

        let expectedPath = "/Applications"
        // Get the parent directory of the bundle (i.e., the directory containing the .app)
        let appBundlePath = Bundle.main.bundlePath.deletingLastPathComponent

        // Validate that the app is inside /Applications
        guard appBundlePath.hasPrefix(expectedPath) else {
            LogWarn("App is running outside of \(expectedPath): \(appBundlePath)")
            let alert = NSAlert()
            // Configure alert buttons and texts (localized)
            alert.addButton(withTitle: .localized.base.close_button).keyEquivalent = "\r"
            alert.messageText = .localized.base.error_running_app
            alert.informativeText = .localized.base.error_running_app_message
            alert.alertStyle = .warning

            alert.runModal()
            return false
        }

        LogInfo("App is running from the expected location: \(appBundlePath)")
        return true
    }

    private func checkLoginItem() {
        self.loginItemService.delegate = self
        if !self.loginItemService.tryRegisterHelper() {
            LogError("Can't register item")
            self.eventBus.post(event: .loginItemStateChange, userInfo: false)
        } else {
            self.safariApiHandler.start()
        }
    }

    private func shouldProcessQuit() async -> Bool {
        switch self.userSettingsManager.quitReaction {
        case .ask:
            self.firstExitTry = false
        case .quit:
            self.terminate()
            return false
        case .keepRunning:
            if self.firstExitTry {
                self.firstExitTry = false
                self.webViewAppsController.hide(.settings)
                // Only swallow the first quit when an app window is actually
                // Visible; if nothing is open (settings closed + tray
                // Dismissed) the first Cmd+Q proceeds to the quit alert
                // Instead of silently doing nothing.
                let hasVisibleWindows = self.hasVisibleImportantApps()
                if hasVisibleWindows {
                    return false
                }
            }
        }

        return true
    }

    /// Whether any module window is currently visible (used to decide if the
    /// first quit should just hide, per `quitReaction == .keepRunning`).
    private func hasVisibleImportantApps() -> Bool {
        let moduleIds: [ModuleId] = [.tray, .settings, .onboarding, .userrules]
        return moduleIds.contains { module in
            self.webViewAppsController.host(for: module)?.window.isVisible ?? false
        }
    }

    /// This method checks if the currentAppleEvent event is a quit event and there is no system quit event, and the sender is the "com.apple.dock" app.
    /// - Returns: True if app quitting via dock.
    private func isAppQuittingViaDock() -> Bool {
        guard let appleEvent = NSAppleEventManager.shared().currentAppleEvent,
              appleEvent.eventClass == kCoreEventClass,
              appleEvent.eventID == kAEQuitApplication,
              appleEvent.attributeDescriptor(forKeyword: kAEQuitReason).isNil,
              let senderPID = appleEvent.attributeDescriptor(forKeyword: keySenderPIDAttr)?.int32Value,
              senderPID != 0,
              let sender = NSRunningApplication(processIdentifier: senderPID)
        else {
            return false
        }

        return "com.apple.dock" == sender.bundleIdentifier
    }

    private func terminate() {
        self.readyToTerminate = true
        Task { @MainActor in
            NSApplication.shared.terminate(self)
        }
    }
}

extension AppDelegate {
    @objc private func systemDidWake(_ notification: Notification) {
        self.attemptResumeIfReady()
        self.scheduleDelayedResumeCheck()
    }
    @objc private func screensDidWake(_ notification: Notification) {
        self.attemptResumeIfReady()
        self.scheduleDelayedResumeCheck()
    }

    private func attemptResumeIfReady() {
        if self.isWaitingForWake && self.isDisplayReady() {
            self.isWaitingForWake = false
            let block = self.pendingStartStep1Remainder
            self.pendingStartStep1Remainder = nil
            block?()
        }
    }

    private func scheduleDelayedResumeCheck() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.attemptResumeIfReady()
        }
    }

    // MARK: - WKWebView failure wiring

    /// Production wiring — creates a `WKWebViewAppHost` with failure
    /// presenter + RPC timeout monitor for each module. All four host
    /// factory cases route through this helper so every WKWebView instance
    /// logs + records telemetry for RPC timeouts in both Debug and Release
    /// builds — no user-facing alert, per the slow-but-alive
    /// false-positive finding. Constructing `WKWebViewAppHost` directly
    /// instead leaves the default `WKWebViewFailurePresenter.noOp`, which
    /// silently swallows load failures, JS runtime errors, and the
    /// recurring-timeout signal.
    private func makeWebViewAppHostProduction(
        module: ModuleId,
        onVisibilityChange: VisibilityChange? = nil,
        bridgeSetup: @escaping (WKWebViewBridge) -> Void,
        extraMessageHandlersSetup: ((WKUserContentController) -> Void)? = nil
    ) -> WKWebViewAppHost {
        let monitor = RecurringRpcTimeoutMonitor()
        let presenter = WKWebViewFailurePresenter(
            recordTelemetry: { [weak self] event in
                await self?.telemetryService?.sendEvent(event)
            },
            presentAlert: { alert in await alert.show() },
            restartApp: { [weak self] in
                self?.appLifecycleService?.terminate(restart: true)
            }
        )
        return WKWebViewAppHost(
            module: module,
            onVisibilityChange: onVisibilityChange,
            failurePresenter: presenter,
            bridgeSetup: { bridge in
                // Wire the bridge's evaluateJavaScript-timeout closures to
                // The monitor. `recordTimeout()`/`recordSuccess()` drive
                // `handleRecurringRpcTimeout`: log + telemetry only, with
                // No user-facing alert. Recurring timeouts can be false
                // Positives from slow-but-alive modules (e.g. the user-rules
                // Editor's initial load), so a blocking dialog is wrong.
                bridge.onJavaScriptTimeout = { _, _ in
                    let crossed = monitor.recordTimeout()
                    if crossed {
                        Task { @MainActor in
                            await presenter.handleRecurringRpcTimeout()
                        }
                    }
                }
                bridge.onJavaScriptSuccess = {
                    monitor.recordSuccess()
                }
                // Forward the original bridge setup (service registrations).
                bridgeSetup(bridge)
            },
            extraMessageHandlersSetup: extraMessageHandlersSetup
        )
    }
}

// MARK: - LoginItemServiceDelegate implementation

extension AppDelegate: LoginItemServiceDelegate {
    func registrationSuccessful() {
        LogWarn("LoginItem Registration Successful")
        self.eventBus.post(event: .loginItemStateChange, userInfo: true)
        self.safariApiHandler.start()
    }
}
