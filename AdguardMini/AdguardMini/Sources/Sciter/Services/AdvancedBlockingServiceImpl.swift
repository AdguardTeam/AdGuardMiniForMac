// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AdvancedBlockingServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML

extension Sciter.AdvancedBlockingServiceImpl:
    UserSettingsServiceDependent,
    URLFilterServiceDependent,
    URLFilterStateAssemblerDependent {}

extension Sciter {
    final class AdvancedBlockingServiceImpl: AdvancedBlockingService.ServiceType {
        var userSettingsService: UserSettingsService!
        var urlFilterService: URLFilterService!
        var urlFilterStateAssembler: URLFilterStateAssembler!

        override init() {
            super.init()
            self.setupServices()
        }

        func getAdvancedBlocking(_ message: SciterSchema.EmptyValue,
                                 _ promise: @escaping (SciterSchema.AdvancedBlocking) -> Void) {
            promise(self.userSettingsService.advancedBlockingState.toProto(
                realTimeFiltersUpdate: self.userSettingsService.realTimeFiltersUpdate
            ))
        }

        func updateAdvancedBlocking(_ message: SciterSchema.AdvancedBlocking,
                                    _ promise: @escaping (SciterSchema.EmptyValue) -> Void) {
            self.userSettingsService.advancedBlockingState = message.toDTO()
            promise(EmptyValue())
        }

        func updateRealTimeFiltersUpdate(_ message: BoolValue,
                                         _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.setRealTimeFiltersUpdate(message.value)
            promise(EmptyValue())
        }

        func getURLFilterState(_ message: EmptyValue,
                               _ promise: @escaping (SciterSchema.URLFilterState) -> Void) {
            Task {
                let state = await self.urlFilterStateAssembler.makeState()
                promise(state.toProto())
            }
        }

        func markURLFilterInstallRequested(_ message: EmptyValue,
                                           _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                await self.urlFilterStateAssembler.markInstallRequested()
                promise(EmptyValue())
            }
        }

        func resetURLFilterCache(_ message: EmptyValue,
                                 _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                do {
                    try await self.urlFilterService.resetCache()
                } catch {
                    LogError("Failed to reset URLFilter cache: \(error)")
                }

                promise(EmptyValue())
            }
        }

        func removeURLFilter(_ message: EmptyValue,
                             _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                do {
                    try await self.urlFilterService.removeConfiguration()
                } catch {
                    LogError("Failed to remove URLFilter configuration: \(error)")
                }

                promise(EmptyValue())
            }
        }

        func updateURLFilterConfiguration(_ message: SciterSchema.URLFilterConfiguration,
                                          _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                do {
                    // TODO: AG-56649
                    // Need to fix convertation
                    let protectionLevel = URLFilterProtectionLevel(proto: message.protectionLevel)
                    self.userSettingsService.urlFilterProtectionLevel = protectionLevel
                    self.userSettingsService.urlFilterIsNew = message.isNew
                    self.userSettingsService.urlFilterIsPageNew = message.isPageNew

                    // TODO: AG-56649
                    // Need to fix initialization
                    let current = try await self.urlFilterService.loadConfiguration()
                    let configuration = URLFilterConfiguration(
                        protectionLevel: protectionLevel,
                        prefilterFetchInterval: current?.prefilterFetchInterval ?? 45.minutes,
                        shouldFailClosed: current?.shouldFailClosed ?? false,
                        enabled: message.enabled
                    )

                    try await self.urlFilterService.save(configuration: configuration)
                } catch {
                    LogError("Failed to update URLFilter configuration: \(error)")
                }

                promise(EmptyValue())
            }
        }
    }
}
