// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppDelegate.swift
//  AdguardMini
//

import Cocoa
import ServiceManagement

import AML
import CoreGraphics

// MARK: - AppDelegate

extension AppDelegate:
    AppMetadataDependent,
    SafariApiHandlerDependent,
    LoginItemServiceDependent,
    UrlSchemesProcessorDependent,
    SciterAppControllerDependent,
    SciterCallbackServiceDependent,
    SciterOnboardingCallbackServiceDependent,
    BackendServiceDependent,
    TelemetryServiceDependent,
    EventBusDependent,
    ProtectionServiceDependent,
    UserSettingsManagerDependent,
    SentryHelperDependent,
    LegacyMigrationServiceDependent {}

#if MAS
extension AppDelegate: AppStoreRateUsDependent {}
#endif

final class AppDelegate: NSObject, NSApplicationDelegate {
    // MARK: Internal services

    var appMetadata: AppMetadata!
    var safariApiHandler: SafariApiHandler!
    var loginItemService: LoginItemService!
    var urlSchemesProcessorInjector: (() -> any UrlSchemesProcessor)!
    var sciterAppController: SciterAppsController!
    var sciterCallbackService: SciterCallbackService!
    var sciterOnboardingCallbackService: SciterOnboardingCallbackService!
    var backendService: BackendService!
    var telemetryService: Telemetry.Service!
    var eventBus: EventBus!
    var protectionService: ProtectionService!
    var userSettingsManager: UserSettingsManager!
    var legacyMigrationService: LegacyMigrationService!
    var sentryHelper: SentryHelper!

    #if MAS
    var appStoreRateUs: AppStoreRateUs!
    #endif

    // MARK: Private properties

    private let metricKitSubscriber: MetricKitSubscriber = MetricKitSubscriberImpl()
    private var performQuit = false
    private var firstExitTry: Bool = true
    private var readyToTerminate: Bool = false

    private var migrationSuccess: Bool = false

    private var effectiveThemeObserver: Any!
    private var isWaitingForWake: Bool = false
    private var pendingStartStep1Remainder: (() -> Void)?
    private var sciterEnteredConfigurationState: Bool = false

    // MARK: Public

    override init() {
        super.init()
        self.setupServices()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        LogInfo("Did finish launching with notification: \(notification)")

        if !self.checkAppLocation() {
#if !DEBUG
            NSApplication.shared.terminate(self)
            return
#endif
        }

        LogInfo("Application Started! Version: \(BuildConfig.AG_FULL_VERSION)")

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
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        LogDebugTrace()
        if flag {
            return true
        }

        if self.sciterAppController.isSciterConfigured {
            if self.userSettingsManager.firstRun {
                self.sciterAppController.showApp(.onboarding)
            } else {
                self.sciterAppController.showApp(.tray)
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
            await self.sciterAppController.hideApp(.tray)

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

            await self.sciterAppController.hideApp(.settings)
        }

        return .terminateCancel
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        self.userSettingsManager.firstRun && self.sciterAppController.isSciterConfigured
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

            await self.startAppStep1()
        }
    }

    @MainActor
    private func startAppStep1() async {
        LogInfo("Start App Step 1")

        var updatedFields: [String: Any] = [:]
        let isPaid = await self.backendService.getStoredAppStatusInfo()?.isPaid ?? false
        if self.userSettingsManager.firstRun && isPaid {
            updatedFields =
            [
                SettingsKey.adguardExtra.rawValue: true,
                SettingsKey.realTimeFiltersUpdate.rawValue: true
            ]
        }
        self.userSettingsManager.registerUserDefaults(
            SettingsKey.asDict.merging(updatedFields) { $1 }
        )

        if let currentBuild = Int(BuildConfig.AG_BUILD) {
            await BuildMigration.run(
                storage: BuildMigrationStorageImpl(),
                currentBuild: currentBuild,
                firstRun: self.userSettingsManager.firstRun
            )
        } else {
            LogError("\(BuildMigration.tag) Invalid AG_BUILD: \(BuildConfig.AG_BUILD)")
            assertionFailure("AG_BUILD must be a valid integer")
        }

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
        self.sciterEnteredConfigurationState = true

        self.sciterAppController.configureAndLoadSciter(
            hardwareAcceleration: self.userSettingsManager.hardwareAcceleration
        )

        NSApplication.shared.mainMenu = AppMenu()

        NSApplication.shared.setActivationPolicy(.accessory)

        self.effectiveThemeObserver = NSApplication.shared.observe(\.effectiveAppearance) { _, _ in
            Task {
                let userTheme = self.userSettingsManager.theme
                self.eventBus.post(event: .effectiveThemeChanged, userInfo: userTheme)
            }
        }

        Task {
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

    private func startAppStep2() async {
        LogInfo("Start App Step 2")
        if self.userSettingsManager.firstRun && !self.migrationSuccess {
            await self.sciterAppController.startOnboarding()
        } else {
            if self.userSettingsManager.firstRun { self.userSettingsManager.firstRun.toggle() }
            await self.sciterAppController.startMainApp(openSettings: self.migrationSuccess)

            if self.migrationSuccess {
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
                let hasVisibleApps = await self.sciterAppController.hasVisibleImportantApps()
                await self.sciterAppController.hideApp(.settings)
                if hasVisibleApps {
                    return false
                }
            }
        }

        return true
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
        self.sciterCallbackService.stop()
        self.sciterOnboardingCallbackService.stop()
        self.sciterAppController.shutdown()
        Task { @MainActor in
            NSApplication.shared.terminate(self)
        }
    }
}

extension AppDelegate {
    @objc private func systemDidWake(_ notification: Notification) {
        guard !self.sciterEnteredConfigurationState else {
            return
        }

        self.attemptResumeIfReady()
        self.scheduleDelayedResumeCheck()
    }
    @objc private func screensDidWake(_ notification: Notification) {
        guard !self.sciterEnteredConfigurationState else {
            return
        }

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
}

// MARK: - LoginItemServiceDelegate implementation

extension AppDelegate: LoginItemServiceDelegate {
    func registrationSuccessful() {
        LogWarn("LoginItem Registration Successful")
        self.eventBus.post(event: .loginItemStateChange, userInfo: true)
        self.safariApiHandler.start()
    }
}
