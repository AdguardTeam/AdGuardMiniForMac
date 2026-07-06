// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  OnboardingApp.swift
//  AdguardMini
//

import AppKit
import AML

final class OnboardingApp: SciterApp,
                           InternalServiceDependent,
                           OnboardingServiceDependent,
                           FiltersServiceDependent,
                           SettingsServiceDependent,
                           CommonServiceDependent,
                           TelemetrySciterServiceDependent,
                           OnboardingCallbackServiceDependent {
    override init(
        windowRect: CGRect,
        archivePath: String,
        hideOnLoosingFocus: Bool,
        enableFrameAutosave: Bool
    ) {
        super.init(
            windowRect: windowRect,
            archivePath: archivePath,
            hideOnLoosingFocus: hideOnLoosingFocus,
            enableFrameAutosave: enableFrameAutosave
        )

        if let window = self.nsWindow {
            window.styleMask.remove(.fullScreen)
            window.styleMask.remove(.miniaturizable)
            window.styleMask.remove(.resizable)
        }

        LogInfo("Initialized - rect: \(windowRect)")
    }
}
