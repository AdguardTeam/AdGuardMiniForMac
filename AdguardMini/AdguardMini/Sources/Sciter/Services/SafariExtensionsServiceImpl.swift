// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionsServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML
import SafariServices

extension Sciter.SafariExtensionsServiceImpl:
    SafariExtensionStatusManagerDependent,
    SafariExtensionStateServiceDependent {}

extension Sciter {
    final class SafariExtensionsServiceImpl: SafariExtensionsService.ServiceType {
        var safariExtensionStatusManager: SafariExtensionStatusManager!
        var safariExtensionStateService: SafariExtensionStateService!

        override init() {
            super.init()
            self.setupServices()
        }

        func getSafariExtensions(_ message: EmptyValue,
                                 _ promise: @escaping (SafariExtensions) -> Void) {
            Task {
                let safariExtensions = await self.safariExtensionStateService.getAllExtensionsStatus()
                let safariExtProto = safariExtensions.toProto()
                promise(safariExtProto)
            }
        }

        func openSafariExtensionPreferences(_ message: OptionalStringValue,
                                            _ promise: @escaping (OptionalError) -> Void) {
            Task {
                let identifier = if message.hasValue, !message.value.isEmpty {
                    message.value
                } else {
                    await self.safariExtensionStatusManager.firstDisabledExtensionId
                }

                var extensionId = SafariBlockerType.general.bundleId
                if let identifier {
                    extensionId = identifier
                } else {
                    // Very important message
                    // swiftlint:disable:next line_length
                    LogError("Attempting to open settings in a situation where no extension ID is specified and all extensions are active.")
                    assertionFailure("Unexpected nil identifier for Safari Extension")
                }

                do {
                    try await SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionId)
                    promise(OptionalError(hasError: false))
                } catch {
                    let message = "Failed to open safari preferences: \(error)"
                    promise(OptionalError(hasError: true, message: message))
                    LogError(message)
                }
            }
        }
    }
}
