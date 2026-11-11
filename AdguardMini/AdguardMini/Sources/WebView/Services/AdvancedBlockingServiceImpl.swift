// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AdvancedBlockingServiceImpl.swift
//  AdguardMini
//

import Foundation
import ProtoSchema
import AML

extension AdvancedBlockingServiceImpl:
    UserSettingsServiceDependent,
    URLFilterServiceDependent,
    URLFilterStateAssemblerDependent,
    MailAppOpenerDependent {}

/// `@unchecked Sendable` because the injected services are assigned once
/// during DI setup and only read afterwards.
final class AdvancedBlockingServiceImpl: AdvancedBlockingService.ServiceType, @unchecked Sendable {
    var userSettingsService: UserSettingsService!
    var urlFilterService: URLFilterService!
    var urlFilterStateAssembler: URLFilterStateAssembler!
    var mailAppOpener: MailAppOpening!

    override init() {
        super.init()
        self.setupServices()
    }

    func getAdvancedRules(_ message: EmptyValue,
                          _ promise: @escaping (BoolValue) -> Void) {
        promise(BoolValue(self.userSettingsService.advancedRules))
    }

    func updateAdvancedRules(_ message: BoolValue,
                             _ promise: @escaping (EmptyValue) -> Void) {
        self.userSettingsService.advancedRules = message.value
        promise(EmptyValue())
    }

    func getAdguardExtra(_ message: EmptyValue,
                         _ promise: @escaping (BoolValue) -> Void) {
        promise(BoolValue(self.userSettingsService.adguardExtra))
    }

    func updateAdguardExtra(_ message: BoolValue,
                            _ promise: @escaping (EmptyValue) -> Void) {
        self.userSettingsService.adguardExtra = message.value
        promise(EmptyValue())
    }

    func getMailProtection(_ message: EmptyValue,
                           _ promise: sending @escaping (BoolValue) -> Void) {
        promise(BoolValue(self.userSettingsService.mailProtection))
    }

    func updateMailProtection(_ message: BoolValue,
                              _ promise: sending @escaping (EmptyValue) -> Void) {
        self.userSettingsService.setMailProtection(message.value)
        promise(EmptyValue())
    }

    func getMailProtectionIsNew(_ message: EmptyValue,
                                _ promise: sending @escaping (BoolValue) -> Void) {
        promise(BoolValue(self.userSettingsService.mailProtectionIsNew))
    }

    func updateMailProtectionIsNew(_ message: BoolValue,
                                   _ promise: sending @escaping (EmptyValue) -> Void) {
        self.userSettingsService.mailProtectionIsNew = message.value
        promise(EmptyValue())
    }

    func getMailOnboardingShown(_ message: EmptyValue,
                                _ promise: sending @escaping (BoolValue) -> Void) {
        promise(BoolValue(self.userSettingsService.mailOnboardingShown))
    }

    func updateMailOnboardingShown(_ message: BoolValue,
                                   _ promise: sending @escaping (EmptyValue) -> Void) {
        self.userSettingsService.mailOnboardingShown = message.value
        promise(EmptyValue())
    }

    func openAppleMail(_ message: EmptyValue,
                       _ promise: sending @escaping (EmptyValue) -> Void) {
        self.mailAppOpener.openAppleMail()
        promise(EmptyValue())
    }

    func openMailExtensionSettings(_ message: EmptyValue,
                                   _ promise: sending @escaping (EmptyValue) -> Void) {
        self.mailAppOpener.openMailExtensionSettings()
        promise(EmptyValue())
    }

    func getRealTimeFiltersUpdate(_ message: EmptyValue,
                                  _ promise: @escaping (BoolValue) -> Void) {
        promise(BoolValue(self.userSettingsService.realTimeFiltersUpdate))
    }

    func updateRealTimeFiltersUpdate(_ message: BoolValue,
                                     _ promise: @escaping (EmptyValue) -> Void) {
        self.userSettingsService.setRealTimeFiltersUpdate(message.value)
        promise(EmptyValue())
    }

    func resetURLFilterCache(_ message: EmptyValue,
                             _ promise: sending @escaping (OptionalError) -> Void) {
        Task { @MainActor in
            do {
                try await self.urlFilterService.resetCache()
                promise(.noError)
            } catch {
                LogError("Failed to reset URLFilter cache: \(error)")
                promise(.error())
            }
        }
    }

    func removeURLFilter(_ message: EmptyValue,
                         _ promise: sending @escaping (OptionalError) -> Void) {
        Task { @MainActor in
            do {
                try await self.urlFilterService.removeConfiguration()
                promise(.noError)
            } catch {
                LogError("Failed to remove URLFilter configuration: \(error)")
                promise(.error())
            }
        }
    }

    func getURLFilterState(_ message: EmptyValue,
                           _ promise: sending @escaping (ProtoSchema.URLFilterState) -> Void) {
        Task { @MainActor in
            let state = await self.urlFilterStateAssembler.makeState()
            promise(state.toProto())
        }
    }

    func setURLFilterEnabled(_ message: BoolValue,
                             _ promise: sending @escaping (OptionalError) -> Void) {
        Task { @MainActor in
            do {
                try await self.urlFilterService.setEnabledByUser(message.value)
                promise(.noError)
            } catch {
                LogError("Failed to update URLFilter configuration: \(error)")
                promise(.error())
            }
        }
    }

    func retryURLFilter(_ message: EmptyValue,
                        _ promise: sending @escaping (EmptyValue) -> Void) {
        Task { @MainActor in
            await self.urlFilterService.retryIfNeeded()
            promise(EmptyValue())
        }
    }

    func requestUpdateURLFilterProtectionLevel(_ message: URLFilterProtectionLevelUpdate,
                                               _ promise: sending @escaping (OptionalError) -> Void) {
        Task { @MainActor in
            do {
                try await self.urlFilterService.setProtectionLevel(message.protectionLevel.toSwift())
                promise(.noError)
            } catch {
                LogError("Failed to update URLFilter protection level: \(error)")
                promise(.error())
            }
        }
    }

    func getURLFilterSeen(_ message: EmptyValue,
                          _ promise: @escaping (BoolValue) -> Void) {
        let isNew = self.userSettingsService.urlFilterIsNew
        promise(BoolValue(isNew))
    }

    func updateURLFilterSeen(_ message: BoolValue,
                             _ promise: @escaping (EmptyValue) -> Void) {
        self.userSettingsService.urlFilterIsNew = message.value
        promise(EmptyValue())
    }
}
