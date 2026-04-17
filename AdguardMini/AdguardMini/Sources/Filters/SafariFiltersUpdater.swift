// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariFiltersUpdater.swift
//  AdguardMini
//

import Foundation

import AML
import FLM

// MARK: - Constants

private enum Constants {
    /// 1 second.
    static let debounceTime: TimeInterval = 1.second
}

// MARK: - SafariFiltersUpdater

protocol SafariFiltersUpdater: RestartableService {
    func updateSafariFilters()
}

// MARK: - SafariFiltersUpdaterImpl

final class SafariFiltersUpdaterImpl: RestartableServiceBase, SafariFiltersUpdater {
    private let filterListManager: FLMProtocol

    private let safariConverter: SafariConverter
    private let safariFiltersStorage: SafariFiltersStorage
    private let safariExtensionManager: SafariExtensionManager

    private let userSettingsService: UserSettingsService

    private let debouncer = Debouncer(debounceTimeSeconds: Constants.debounceTime)
    private var hasPendingUpdates: Bool = false
    private var currentUpdateTask: Task<Void, Never>?

    // For debugging duplicate updates
    private var updateCounter: Int = 0

    private let lk = UnfairLock()

    init(
        filterListManager: FLMProtocol,
        safariConverter: SafariConverter,
        safariFiltersStorage: SafariFiltersStorage,
        safariExtensionManager: SafariExtensionManager,
        userSettingsService: UserSettingsService
    ) {
        self.filterListManager = filterListManager
        self.safariConverter = safariConverter
        self.safariFiltersStorage = safariFiltersStorage
        self.safariExtensionManager = safariExtensionManager
        self.userSettingsService = userSettingsService

        super.init()
    }

    private func checkCancellation(_ progress: Progress) throws {
        try Task.checkCancellation()
        if progress.isCancelled {
            throw CancellationError()
        }
    }

    override func start() {
        var hasPendingUpdates = false
        locked(self.lk) {
            super.start()
            hasPendingUpdates = self.hasPendingUpdates
        }
        // Process any pending updates that accumulated while stopped
        if hasPendingUpdates {
            self.updateSafariFilters()
        }
    }

    @objc
    func updateSafariFilters() {
        locked(self.lk) {
            guard self.isStarted
            else {
                self.hasPendingUpdates = true
                return
            }

            // Cancel previous task if it's still running (new state requires fresh update)
            if let currentTask = self.currentUpdateTask, !currentTask.isCancelled {
                currentTask.cancel()
            }

            self.currentUpdateTask = self.createUpdateTask()
        }
    }

    private func createUpdateTask() -> Task<Void, Never> {
        Task {
            let progress = Progress(totalUnitCount: 4)

            await self.debouncer.debounce { [weak self] in
                guard let self else { return }

                // Reset pending updates flag at the start
                self.hasPendingUpdates = false

                self.updateCounter += 1
                let updateId = self.updateCounter
                LogInfo("Safari filters update started (ID: \(updateId))")

                do {
                    try self.checkCancellation(progress)

                    // Stage 1: Get filters for conversion

                    var stageStart = Date()
                    var rawFilters = self.filterListManager.getActiveRulesInfo()

                    try self.checkCancellation(progress)

                    if !self.userSettingsService.languageSpecific {
                        rawFilters = rawFilters.filter { filter in
                            filter.groupId != FiltersDefinedGroup.languageSpecific.id
                        }
                    }

                    LogInfo("\(LogTag.safari) getActiveRulesInfo end (ID: \(updateId)), \(stageStart.elapsedMs())")
                    progress.completedUnitCount += 1

                    try self.checkCancellation(progress)

                    // Stage 2: Reset converted filters storage

                    stageStart = Date()
                    self.safariFiltersStorage.resetStorage()
                    LogInfo("\(LogTag.safari) resetStorage end (ID: \(updateId)), \(stageStart.elapsedMs())")
                    progress.completedUnitCount += 1

                    try self.checkCancellation(progress)

                    // Stage 3: Convert rules and save

                    stageStart = Date()
                    LogInfo("\(LogTag.safari) convertRulesAndSave start (ID: \(updateId))")
                    let updatedBlockers = self.safariConverter.convertRulesAndSave(
                        filters: rawFilters,
                        advanced: self.userSettingsService.advancedBlockingState.advancedRules,
                        progress: progress
                    )
                    progress.completedUnitCount += 1

                    try self.checkCancellation(progress)

                    // Stage 4: Reload content blockers

                    LogInfo("\(LogTag.safari) convertRulesAndSave end (ID: \(updateId)), \(stageStart.elapsedMs())")

                    let reloadStart = Date()
                    LogInfo("\(LogTag.safari) reloadContentBlockers start (ID: \(updateId))")
                    await withTaskGroup(of: Void.self) { group in
                        for await blocker in updatedBlockers {
                            group.addTask {
                                let blockerType = blocker.blockerType
                                LogDebug("Blocker \(blockerType) conversion info: \(blocker.conversionInfo)")
                                await self.safariExtensionManager.reloadContentBlocker(blockerType)
                            }
                        }
                    }
                    LogInfo("\(LogTag.safari) reloadContentBlockers end (ID: \(updateId)), \(reloadStart.elapsedMs())")

                    progress.completedUnitCount += 1

                    LogInfo("Safari filters update ended (ID: \(updateId))")
                } catch is CancellationError {
                    LogInfo("Safari filters update was cancelled (ID: \(updateId))")
                } catch {
                    LogError("Safari filters update failed (ID: \(updateId)): \(error)")
                }
            } onCancel: {
                progress.cancel()
            }
        }
    }
}
