// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  InternalServiceImpl.swift
//  AdguardMini
//

import AppKit
import SciterSchema
import SciterSDKAdapter
import SciterSwift
import AML

extension Sciter.InternalServiceImpl:
    SciterAppControllerDependent,
    EventBusDependent,
    SupportDependent {}

extension Sciter {
    /// Service for miscellaneous internal operations
    final class InternalServiceImpl: InternalService.ServiceType {
        // MARK: Private properties

        var sciterAppController: SciterAppsController!
        var support: Support!
        var eventBus: EventBus!

        override init() {
            super.init()

            self.setupServices()
        }

        // MARK: Protocol implementation

        func openSettingsWindow(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            Task { @MainActor in
                self.sciterAppController.showApp(.settings)
                self.eventBus.post(event: .settingsWindowOpened, userInfo: nil)

                promise(EmptyValue())
            }
        }

        func openSafariSettings(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            LogError("Not implemented")
            promise(EmptyValue())
        }

        func showInFinder(_ message: Path, _ promise: @escaping (EmptyValue) -> Void) {
            NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: message.path)])
            promise(EmptyValue())
        }

        func reportAnIssue(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                guard let url = await self.support.reportSiteUrl(reportUrl: nil, from: "support") else {
                    promise(EmptyValue())
                    LogError("Can't create report URL")
                    return
                }
                NSWorkspace.shared.open(url)
                promise(EmptyValue())
            }
        }
    }
}
