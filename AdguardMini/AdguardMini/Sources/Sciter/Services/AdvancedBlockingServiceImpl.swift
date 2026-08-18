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

        func markURLFilterSeen(_ message: SciterSchema.URLFilterSeen,
                               _ promise: @escaping (EmptyValue) -> Void) {
            // Persists only the UI seen flags and never touches the platform
            // URL filter configuration, so no install prompt is triggered.
            self.userSettingsService.urlFilterIsNew = message.isNew
            self.userSettingsService.urlFilterIsPageNew = message.isPageNew
            promise(EmptyValue())
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
                    await self.urlFilterStateAssembler.markConfigurationRemoved()
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
                    let dto = message.toDTO()

                    self.userSettingsService.urlFilterProtectionLevel = dto.protectionLevel

                    // The wire format omits the platform-only fields.
                    // Preserve their values from the current configuration.
                    // Defaults apply only when no configuration exists yet.
                    let current = try await self.urlFilterService.loadConfiguration()
                    var configuration = URLFilterConfiguration(
                        protectionLevel: dto.protectionLevel,
                        enabled: dto.enabled
                    )
                    if let current {
                        configuration.prefilterFetchInterval = current.prefilterFetchInterval
                        configuration.shouldFailClosed = current.shouldFailClosed
                    }

                    try await self.urlFilterService.save(configuration: configuration)
                } catch {
                    LogError("Failed to update URLFilter configuration: \(error)")
                }

                promise(EmptyValue())
            }
        }
    }
}
