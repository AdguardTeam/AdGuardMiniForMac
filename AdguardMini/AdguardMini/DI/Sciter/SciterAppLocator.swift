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

    var onboardingApp: OnboardingApp {
        locked(self.lk) {
            let app = self._onboardingApp ?? self.newOnboardingApp()
            if self._onboardingApp.isNil {
                self._onboardingApp = app
            }
            return app
        }
    }

    var trayApp: TrayApp {
        locked(self.lk) {
            let app = self._trayApp ?? self.newTrayApp()
            if self._trayApp.isNil {
                self._trayApp = app
            }
            return app
        }
    }

    var settingsApp: SettingsApp {
        locked(self.lk) {
            let app = self._settingsApp ?? self.newSettingsApp()
            if self._settingsApp.isNil {
                self._settingsApp = app
            }
            return app
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
#if UI_TESTS
        // In UI test builds, keep the tray visible so that
        // the test peer (test-peer.js) can service TCP connections.
        let hideOnLosingFocus = false
#else
        let hideOnLosingFocus = true
#endif
        let app = TrayApp(
            windowRect: Constants.trayWindowRect,
            archivePath: Constants.trayArchivePath,
            hideOnLoosingFocus: hideOnLosingFocus,
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
