// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FiltersServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML
import FLM

extension Sciter.FiltersServiceImpl:
    FiltersSupervisorDependent {}

extension Sciter {
    final class FiltersServiceImpl: FiltersService.ServiceType {
        var filtersSupervisor: FiltersSupervisor!

        override init() {
            super.init()
            self.setupServices()
        }

        func updateFilters(_ message: FiltersUpdate, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                await self.filtersSupervisor.setFilters(message.ids.map(Int.init), enabled: message.isEnabled)
                promise(OptionalError(hasError: false))
            }
        }

        func getFiltersMetadata(_ message: EmptyValue, _ promise: @escaping (Filters) -> Void) {
            Task {
                let filters = await self.filtersSupervisor.getStoredFilterMetadataWithRulesCount()
                var customFilters: [Filter] = []
                var basicFilters: [Filter] = []
                filters.forEach { filter in
                    if filter.meta.filterId == self.filtersSupervisor.filtersSpecialIds.userRulesId {
                        return
                    }
                    let toAppend = filter.meta.toFilterProto(rulesCount: filter.count)
                    if filter.meta.isCustom {
                        customFilters.append(toAppend)
                    } else {
                        basicFilters.append(toAppend)
                    }
                }
                promise(
                    Filters(
                        filters: basicFilters,
                        customFilters: customFilters,
                        languageSpecific: self.filtersSupervisor.languageSpecific
                    )
                )
            }
        }

        func updateLanguageSpecific(_ message: BoolValue, _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                await self.filtersSupervisor.switchLanguageSpecific(message.value)
                promise(EmptyValue())
            }
        }

        func getEnabledFiltersIds(_ message: EmptyValue, _ promise: @escaping (FiltersEnabledIds) -> Void) {
            Task {
                var ids = await self.filtersSupervisor.getEnabledFilterIds()
                var data = FiltersEnabledIds()
                ids = ids.filter { id in
                    id != self.filtersSupervisor.filtersSpecialIds.userRulesId
                }
                data.ids = ids.map(Int32.init)
                promise(data)
            }
        }

        func checkCustomFilter(_ message: Path, _ promise: @escaping (FilterOrError) -> Void) {
            enum Internal {
                static let dateFormatter = ISO8601DateFormatter()
            }

            Task {
                var filter = FilterOrError()
                guard let meta = await self.filtersSupervisor.fetchFilterMetadata(from: message.path) else {
                    LogError("Failed to check custom filter")
                    filter.error = true
                    promise(filter)
                    return
                }

                let timeUpdated = Internal.dateFormatter.date(from: meta.timeUpdated)?.timeIntervalSince1970 ?? 0

                filter.filter = Filter(
                    id: 0,
                    groupID: Int32(self.filtersSupervisor.filtersSpecialIds.customGroupId),
                    enabled: false,
                    timeUpdated: Int64(timeUpdated),
                    title: meta.name,
                    description_p: meta.summary,
                    version: meta.version,
                    homepage: meta.homepage,
                    rulesCount: Int32(meta.rulesCount),
                    languages: [],
                    trusted: false
                )
                promise(filter)
            }
        }

        func confirmAddCustomFilter(_ message: CustomFilterToAdd, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                do {
                    try await self.filtersSupervisor.installCustomFilter(
                        from: message.url,
                        isTrusted: message.trusted,
                        title: message.title,
                        description: nil
                    )
                    promise(OptionalError(hasError: false))
                } catch {
                    let message = "Failed to add custom filter \(error)"
                    promise(OptionalError(hasError: true, message: message))
                    LogError(message)
                }
            }
        }

        func deleteCustomFilters(_ message: CustomFiltersToDelete, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                do {
                    try await self.filtersSupervisor.removeCustomFilters(message.filtersIds.map(Int.init))
                    promise(OptionalError(hasError: false))
                } catch {
                    let message = "Failed to delete custom filter \(error)"
                    promise(OptionalError(hasError: true, message: message))
                    LogError(message)
                }
            }
        }

        func getFiltersIndex(_ message: EmptyValue, _ promise: @escaping (SciterSchema.FiltersIndex) -> Void) {
            Task {
                let index = await self.filtersSupervisor.getFiltersIndex()
                promise(index.toProto())
            }
        }

        func updateCustomFilter(_ message: CustomFilterUpdateRequest, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                await self.filtersSupervisor.updateCustomFilterMetadata(
                    Int(message.filterID),
                    title: message.title,
                    trusted: message.isTrusted
                )
                promise(OptionalError(hasError: false))
            }
        }

        func requestFiltersUpdate(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            self.filtersSupervisor.filtersForceUpdate()
            promise(EmptyValue())
        }

        func getFiltersGroupedByExtensions(_ message: EmptyValue,
                                           _ promise: @escaping (FiltersGroupedByExtensions) -> Void) {
            Task {
                var filters = await self.filtersSupervisor.getActiveRulesInfo()
                // Safari extension do not use language specific filters when languageSpecific option is disabled by user
                // So exclude language specific filters
                if !self.filtersSupervisor.languageSpecific {
                    filters = filters.filter { filter in
                        filter.groupId != FiltersDefinedGroup.languageSpecific.id
                    }
                }
                let res = self.groupFilters(filters: filters)

                var data = FiltersGroupedByExtensions()
                data.general = (res[SafariBlockerType.general] ?? []).map(Int32.init)
                data.privacy = (res[SafariBlockerType.privacy] ?? []).map(Int32.init)
                data.social = (res[SafariBlockerType.socialWidgetsAndAnnoyances] ?? []).map(Int32.init)
                data.security = (res[SafariBlockerType.security] ?? []).map(Int32.init)
                data.other = (res[SafariBlockerType.other] ?? []).map(Int32.init)
                data.custom = (res[SafariBlockerType.custom] ?? []).map(Int32.init)

                promise(data)
            }
        }

        /// Groups filters by Safari blocker type based on their groupId
        private func groupFilters(filters: [ActiveFilterInfo]) -> [SafariBlockerType: [Int]] {
            var result: [SafariBlockerType: [Int]] = [:]

            var filtersGroupedByGroup: [Int: [Int]] = [:]

            for filter in filters {
                filtersGroupedByGroup[filter.groupId, default: []].append(filter.filterId)
            }

            for blocker in SafariBlockerType.allCases {
                var names: [Int] = []
                blocker.filtersGroups.forEach { filterGroup in
                    names.append(contentsOf: filtersGroupedByGroup[filterGroup.id] ?? [])
                }
                result[blocker] = names
            }
            return result
        }
    }
}
