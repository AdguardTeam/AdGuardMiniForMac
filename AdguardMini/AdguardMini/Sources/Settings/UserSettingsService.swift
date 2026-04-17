// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UserSettingsService.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - UserSettingsService

protocol UserSettingsService: AnyObject {
    var firstRun: Bool { get }

    // MARK: Properties without side effects
    var languageSpecific:        Bool { get set }
    var lastFiltersUpdateTime:   Date { get set }
    var quitReaction:            QuitReaction { get set }
    var userConsent:             [Int] { get set }
    var userActionLastDirectory: String { get set }
    var allowTelemetry:          Bool { get set }
    var userRulesEditorGeometry: WindowGeometryDTO? { get set }

    // MARK: Properties with side effects

    var advancedBlockingState: AdvancedBlockingDTO { get set }
    var autoFiltersUpdate: Bool { get }
    var realTimeFiltersUpdate: Bool { get }
    var settings: SettingsDTO { get }
    var theme: Theme { get }

    func setAutoFiltersUpdate(_ value: Bool)
    func setRealTimeFiltersUpdate(_ value: Bool)
    func setDebugLogging(_ value: Bool)
    func setHardwareAcceleration(_ value: Bool)
    func setLaunchOnStartup(_ value: Bool)
    func setShowInMenuBar(_ value: Bool)
    func setTheme(_ theme: Theme)

    @discardableResult
    func updateSettings(newSettings: SettingsDTO) -> SettingsDTO
    func resetSettings()
}

// MARK: - UserSettingsServiceImpl

final class UserSettingsServiceImpl {
    private let keychain: KeychainManager
    private let userSettingsManager: UserSettingsManager
    private let appSettingUpdateHandler: AppSettingUpdateHandler
    private let sharedSettingsStorage: SharedSettingsStorage
    private let eventBus: EventBus

    @UserDefault(key: .lastFiltersUpdateTime, defaultValue: Date.distantPast)
    var lastFiltersUpdateTime: Date

    @UserDefault(key: .userRulesEditorGeometry, defaultValue: nil)
    private var userRulesEditorGeometryData: Data?

    init(
        keychain: KeychainManager,
        userSettingsManager: UserSettingsManager,
        appSettingUpdateHandler: AppSettingUpdateHandler,
        sharedSettingsStorage: SharedSettingsStorage,
        eventBus: EventBus
    ) {
        self.keychain = keychain
        self.userSettingsManager = userSettingsManager
        self.appSettingUpdateHandler = appSettingUpdateHandler
        self.sharedSettingsStorage = sharedSettingsStorage
        self.eventBus = eventBus

        self.setup()

        self.eventBus.subscribe(
            observer: self,
            selector: #selector(self.handlePaidStatusChange),
            event: .paidStatusChanged
        )
    }

    private func setup() {
        if self.userSettingsManager.firstRun {
            Task { await self.keychain.delete(key: .debugLogging) }
        }
    }
}

// MARK: - UserSettingsService implementation

extension UserSettingsServiceImpl: UserSettingsService {
    var firstRun: Bool {
        self.userSettingsManager.firstRun
    }

    // MARK: Properties without side effects

    var languageSpecific: Bool {
        get { self.userSettingsManager.languageSpecific }
        set { self.userSettingsManager.languageSpecific = newValue }
    }

    var quitReaction: QuitReaction {
        get { self.userSettingsManager.quitReaction }
        set { self.userSettingsManager.quitReaction = newValue }
    }

    var userConsent: [Int] {
        get { self.userSettingsManager.userConsent }
        set { self.userSettingsManager.userConsent = newValue }
    }

    var userActionLastDirectory: String {
        get { self.keychain.userActionLastDirectory }
        set { self.keychain.userActionLastDirectory = newValue }
    }

    var allowTelemetry: Bool {
        get { self.userSettingsManager.allowTelemetry }
        set { self.userSettingsManager.allowTelemetry = newValue }
    }

    var userRulesEditorGeometry: WindowGeometryDTO? {
        get {
            guard let data = self.userRulesEditorGeometryData else {
                return nil
            }
            return try? JSONDecoder().decode(WindowGeometryDTO.self, from: data)
        }
        set {
            self.userRulesEditorGeometryData = if let newValue {
                try? JSONEncoder().encode(newValue)
            } else {
                nil
            }
        }
    }

    // MARK: Properties with side effects and special setters

    var advancedBlockingState: AdvancedBlockingDTO {
        get {
            AdvancedBlockingDTO(
                advancedRules: self.sharedSettingsStorage.advancedRules,
                adguardExtra: self.userSettingsManager.adguardExtra
            )
        }
        set(state) {
            self.sharedSettingsStorage.advancedRules = state.advancedRules
            self.userSettingsManager.adguardExtra = state.adguardExtra
        }
    }

    var autoFiltersUpdate: Bool {
        self.userSettingsManager.autoFiltersUpdate
    }

    var realTimeFiltersUpdate: Bool {
        self.userSettingsManager.realTimeFiltersUpdate
    }

    var theme: Theme {
        self.userSettingsManager.theme
    }

    var settings: SettingsDTO {
        get {
            SettingsDTO(
                autoFiltersUpdate:     self.autoFiltersUpdate,
                realTimeFiltersUpdate: self.realTimeFiltersUpdate,
                debugLogging:         self.keychain.debugLogging,
                hardwareAcceleration: self.userSettingsManager.hardwareAcceleration,
                launchOnStartup:      self.sharedSettingsStorage.launchOnStartup,
                showInMenuBar:        self.userSettingsManager.showInMenuBar,
                quitReaction:         self.userSettingsManager.quitReaction,
                theme:                self.theme
            )
        }
        set(obj) {
            self.setAutoFiltersUpdate(obj.autoFiltersUpdate)
            self.setRealTimeFiltersUpdate(obj.realTimeFiltersUpdate)
            self.setTheme(obj.theme)

            self.keychain.debugLogging = obj.debugLogging
            self.userSettingsManager.hardwareAcceleration = obj.hardwareAcceleration
            self.sharedSettingsStorage.launchOnStartup = obj.launchOnStartup
            self.userSettingsManager.showInMenuBar = obj.showInMenuBar
            self.userSettingsManager.quitReaction = obj.quitReaction
        }
    }

    func setAutoFiltersUpdate(_ value: Bool) {
        let old = self.userSettingsManager.autoFiltersUpdate
        self.userSettingsManager.autoFiltersUpdate = value
        self.appSettingUpdateHandler.handleAutoFiltersUpdateUpdates(old, value)
    }

    func setRealTimeFiltersUpdate(_ value: Bool) {
        let old = self.userSettingsManager.realTimeFiltersUpdate
        self.userSettingsManager.realTimeFiltersUpdate = value
        self.appSettingUpdateHandler.handleRealTimeFiltersUpdateUpdates(old, value)
    }

    func setTheme(_ theme: Theme) {
        let old = self.theme
        self.userSettingsManager.theme = theme
        self.appSettingUpdateHandler.handleThemeUpdates(old, theme)
    }

    func setDebugLogging(_ value: Bool) {
        let old = self.keychain.debugLogging
        self.keychain.debugLogging = value
        self.appSettingUpdateHandler.handleDebugLoggingUpdates(old, value)
    }

    @objc func handlePaidStatusChange(notification: Notification) {
        let license: AppStatusInfo? = self.eventBus.parseNotification(notification)

        guard let license else {
            LogWarn("License is nil, treating as free version (backend error fallback)")
            self.appSettingUpdateHandler.handleRealTimeFiltersUpdateUpdates(
                self.realTimeFiltersUpdate,
                false
            )
            self.userSettingsManager.adguardExtra = false
            return
        }

        if !license.isPaid {
            self.setRealTimeFiltersUpdate(false)
            self.userSettingsManager.adguardExtra = false
        } else {
            self.setRealTimeFiltersUpdate(true)
            self.userSettingsManager.adguardExtra = true
        }
    }

    func setHardwareAcceleration(_ value: Bool) {
        let old = self.userSettingsManager.hardwareAcceleration
        self.userSettingsManager.hardwareAcceleration = value
        self.appSettingUpdateHandler.handleHardwareAccelerationUpdates(old, value)
    }

    func setLaunchOnStartup(_ value: Bool) {
        self.sharedSettingsStorage.launchOnStartup = value
    }

    func setShowInMenuBar(_ value: Bool) {
        let oldValue = self.userSettingsManager.showInMenuBar
        self.userSettingsManager.showInMenuBar = value
        self.appSettingUpdateHandler.handleShowInMenuUpdates(oldValue, value)
    }

    func updateSettings(newSettings: SettingsDTO) -> SettingsDTO {
        let oldSettings = self.settings
        self.settings = newSettings

        self.appSettingUpdateHandler.handleUpdates(oldSettings, newSettings)

        return newSettings
    }

    func resetSettings() {
        let oldSettings = self.settings
        self.userSettingsManager.resetSettings()
        let newSettings = self.settings
        self.keychain.delete(key: .userActionLastDirectory)
        self.appSettingUpdateHandler.handleUpdates(oldSettings, newSettings)
    }

    func saveUserDefaults(_ dict: [String: Any]) {
        self.userSettingsManager.updatePersistentDomain(dict)
    }
}
