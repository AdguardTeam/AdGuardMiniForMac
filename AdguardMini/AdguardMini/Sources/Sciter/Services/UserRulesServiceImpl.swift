// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UserRulesServiceImpl.swift
//  AdguardMini
//

import AppKit
import Foundation
import SciterSchema
import AML
import FLM

extension Sciter.UserRulesServiceImpl: FiltersSupervisorDependent,
                                       ImportExportServiceDependent {}

extension Sciter {
    final class UserRulesServiceImpl: UserRulesService.ServiceType {
        var filtersSupervisor: FiltersSupervisor!
        var importExportService: ImportExportService!

        override init() {
            super.init()

            self.setupServices()
        }

        func getUserRules(_ message: EmptyValue, _ promise: @escaping (UserRules) -> Void) {
            Task {
                let userRules = await self.getCurrentUserRulesProto()
                promise(userRules)
            }
        }

        func addUserRule(_ message: StringValue, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                if await self.filtersSupervisor.addUserRule(message.value) {
                    promise(.noError)
                } else {
                    promise(.error("Failed to write user rules"))
                }
            }
        }

        func updateUserRules(_ message: UserRules, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                let rules = message.rules.fromProto()
                await self.filtersSupervisor.saveUserRules(rules)

                let userRulesId = Int(self.filtersSupervisor.filtersSpecialIds.userRulesId)
                await self.filtersSupervisor.setFilters([userRulesId], enabled: message.enabled)
                promise(OptionalError(hasError: false))
            }
        }

        func exportUserRules(_ message: Path, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                do {
                    let rules = await self.filtersSupervisor.getUserRulesAsString()
                    try await self.importExportService.savePlainFile(
                        obj: rules,
                        path: message.path
                    )
                    promise(.noError)
                } catch {
                    let message = "Can't export user rules \(message.path): \(error)"
                    promise(.error(message))
                    LogError(message)
                }
            }
        }

        func importUserRules(_ message: Path, _ promise: @escaping (UserRules) -> Void) {
            Task {
                let result: Result<String, Error> =
                await self.importExportService.loadPlainFile(path: message.path)
                switch result {
                case .success(let rules):
                    await self.filtersSupervisor.saveUserRules(rules)
                    let userRules = await self.getCurrentUserRulesProto()
                    promise(userRules)
                case .failure(let error):
                    LogError("Can't load data from \(message.path): \(error)")
                    // TODO: AG-56500 Send error to Sciter
                    promise(UserRules())
                }
            }
        }

        func resetUserRules(_ message: EmptyValue, _ promise: @escaping (UserRules) -> Void) {
            Task {
                await self.filtersSupervisor.removeUserRules()
                let userRulesFL = await self.filtersSupervisor.getUserRules()
                promise(
                    UserRules(
                        enabled: await self.filtersSupervisor.isUserRulesEnabled(),
                        rules: userRulesFL.toProto()
                    )
                )
            }
        }

        private func getCurrentUserRulesProto() async -> UserRules {
            let rules = await self.filtersSupervisor.getUserRules()
            return UserRules(
                enabled: await self.filtersSupervisor.isUserRulesEnabled(),
                rules: rules.toProto()
            )
        }
    }
}
