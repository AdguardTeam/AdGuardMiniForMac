// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SettingsApp.swift
//  AdguardMini
//

import Foundation
import AML
import SciterSchema

extension SettingsApp: InternalServiceDependent,
                       SettingsServiceDependent,
                       CommonServiceDependent,
                       AccountServiceDependent,
                       AdvancedBlockingServiceDependent,
                       AppInfoServiceDependent,
                       FiltersServiceDependent,
                       UserRulesServiceDependent,
                       SettingsCallbackServiceDependent,
                       AccountCallbackServiceDependent,
                       FiltersCallbackServiceDependent,
                       TelemetrySciterServiceDependent,
                       UserRulesCallbackServiceDependent {}

#if MAS
extension SettingsApp: AppStoreRateUsDependent {}
#endif

final class SettingsApp: SciterApp {
    #if MAS
    var appStoreRateUs: AppStoreRateUs!
    #endif

    override init(windowRect: CGRect, archivePath: String, hideOnLoosingFocus: Bool, enableFrameAutosave: Bool) {
        super.init(
            windowRect: windowRect,
            archivePath: archivePath,
            hideOnLoosingFocus: hideOnLoosingFocus,
            enableFrameAutosave: enableFrameAutosave
        )
        LogInfo("Initialized - rect: \(windowRect)")

        #if MAS
        self.setupServices()
        #endif
    }

    @MainActor
    override func showWindow() async {
        await super.showWindow()

        #if MAS
        self.appStoreRateUs.onWindowOpened()
        #endif
    }

    func windowDidBecomeMain(_ notification: Notification) {
        self.app.callback(SettingsCallbackService.self).onWindowDidBecomeMain(EmptyValue())
        LogDebug("Window became main")
    }
}
