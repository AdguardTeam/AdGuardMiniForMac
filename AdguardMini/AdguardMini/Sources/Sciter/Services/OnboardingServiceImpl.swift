// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  OnboardingServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML
import AppKit

extension Sciter.OnboardingServiceImpl:
    SciterAppControllerDependent,
    UserSettingsManagerDependent,
    EventBusDependent {}

#if MAS
extension Sciter.OnboardingServiceImpl: AppStoreRateUsDependent {}
#endif

extension Sciter {
    final class OnboardingServiceImpl: OnboardingService.ServiceType {
        var sciterAppController: SciterAppsController!
        var userSettingsManager: UserSettingsManager!
        var eventBus: EventBus!

        #if MAS
        var appStoreRateUs: AppStoreRateUs!
        #endif

        override init() {
            super.init()
            self.setupServices()
        }

        func onboardingDidComplete(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            promise(EmptyValue())
            Task.detached(priority: .userInitiated) {
                await self.sciterAppController.hideApp(.onboarding)
                self.sciterAppController.stopApp(.onboarding)
            }

            Task {
                self.userSettingsManager.firstRun = false
                await self.sciterAppController.startMainApp(openSettings: true)

                // AG-49474
//                self.eventBus.post(event: .settingsPageRequested, userInfo: "paywall")
            }
        }

        func getSystemLanguage(_ message: EmptyValue, _ promise: @escaping (StringValue) -> Void) {
            promise(StringValue(Locales.navigatorLang))
        }
    }
}
