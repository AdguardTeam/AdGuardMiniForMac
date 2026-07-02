// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SciterAppLocator.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - Constants

private enum Constants {
    static let onboardingWindowRect = NSRect(x: 500, y: 100, width: 800, height: 752)
    static let onboardingArchivePath = "this://app/onboarding.html"

    static let trayWindowRect = NSRect(x: 100, y: 100, width: 360, height: 582)
    static let trayArchivePath = "this://app/tray.html"

    static let settingsWindowRect = NSRect(x: 500, y: 100, width: 800, height: 580)
    static let settingsArchivePath = "this://app/settings.html"
}

// MARK: - AvailableSciterApp

enum AvailableSciterApp {
    case onboarding
    case tray
    case settings
}

// MARK: - SciterAppLocator

final class SciterAppLocator {
    // MARK: Properties

    private let lk = UnfairLock()

    private var _onboardingApp: OnboardingApp?
    private var _trayApp: TrayApp?
    private var _settingsApp: SettingsApp?

    @inline(__always)
    private func ensureMainThread<T>(_ block: () -> T) -> T {
        if Thread.isMainThread { return block() }
        return DispatchQueue.main.sync(execute: block)
    }

    var onboardingApp: OnboardingApp {
        self.ensureMainThread {
            locked(self.lk) {
                if let app = self._onboardingApp {
                    return app
                }
                let app = self.newOnboardingApp()
                self._onboardingApp = app
                return app
            }
        }
    }

    var trayApp: TrayApp {
        self.ensureMainThread {
            locked(self.lk) {
                if let app = self._trayApp {
                    return app
                }
                let app = self.newTrayApp()
                self._trayApp = app
                return app
            }
        }
    }

    var settingsApp: SettingsApp {
        self.ensureMainThread {
            locked(self.lk) {
                if let app = self._settingsApp {
                    return app
                }
                let app = self.newSettingsApp()
                self._settingsApp = app
                return app
            }
        }
    }

    static let shared = SciterAppLocator()

    // MARK: Public methods

    func stopApp(_ appType: AvailableSciterApp) {
        Task { @MainActor in
            switch appType {
            case .onboarding:
                await self._onboardingApp?.hideWindow()
                self._onboardingApp?.app.releaseServices()
                self._onboardingApp = nil
            case .tray:
                self._trayApp?.app.releaseServices()
                self._trayApp = nil
            case .settings:
                self._settingsApp?.app.releaseServices()
                self._settingsApp = nil
            }
        }
    }

    func stopAll() {
        self.stopApp(.onboarding)
        self.stopApp(.tray)
        self.stopApp(.settings)
    }

    // MARK: Private methods

    private init() {}

    @discardableResult
    private func newOnboardingApp() -> OnboardingApp {
        let app = OnboardingApp(
            windowRect: Constants.onboardingWindowRect,
            archivePath: Constants.onboardingArchivePath,
            hideOnLoosingFocus: false,
            enableFrameAutosave: false
        )
        self._onboardingApp = app
        return app
    }

    @discardableResult
    private func newTrayApp() -> TrayApp {
        let app = TrayApp(
            windowRect: Constants.trayWindowRect,
            archivePath: Constants.trayArchivePath,
            hideOnLoosingFocus: true,
            enableFrameAutosave: false
        )
        self._trayApp = app
        return app
    }

    @discardableResult
    private func newSettingsApp() -> SettingsApp {
        let app = SettingsApp(
            windowRect: Constants.settingsWindowRect,
            archivePath: Constants.settingsArchivePath,
            hideOnLoosingFocus: false,
            enableFrameAutosave: true
        )
        self._settingsApp = app
        return app
    }
}
