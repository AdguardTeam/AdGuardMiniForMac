// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  OnboardingServiceImpl.swift
//  AdguardMini
//

import Foundation
import ProtoSchema
import AML
import AppKit

extension OnboardingServiceImpl:
    WebViewAppsControllerDependent,
    UserSettingsManagerDependent,
    ProtectionServiceDependent,
    EventBusDependent,
    StatusBarItemControllerDependent {}

#if MAS
extension OnboardingServiceImpl: AppStoreRateUsDependent {}
#endif

final class OnboardingServiceImpl: OnboardingService.ServiceType {
    var webViewAppsController: WebViewAppsController!
    var userSettingsManager: UserSettingsManager!
    var protectionService: ProtectionService!
    var eventBus: EventBus!
    var statusBarItemController: StatusBarItemController!

    #if MAS
    var appStoreRateUs: AppStoreRateUs!
    #endif

    override init() {
        super.init()
        self.setupServices()
    }

    func onboardingDidComplete(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
        // Single main-actor task with a deterministic order.
        Task { @MainActor in
            self.webViewAppsController.destroy(.onboarding)
            self.userSettingsManager.firstRun = false
            await self.protectionService.startIfEnabled()
            await self.statusBarItemController.updateStatusBarIcon()
            self.webViewAppsController.show(.settings)
            promise(EmptyValue())
        }
    }

    func getSystemLanguage(_ message: EmptyValue, _ promise: @escaping (StringValue) -> Void) {
        promise(StringValue(Locales.navigatorLang))
    }
}
