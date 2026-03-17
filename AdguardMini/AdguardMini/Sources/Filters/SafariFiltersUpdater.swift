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
        if Task.isCancelled || progress.isCancelled {
            progress.cancel()
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
            self.currentUpdateTask?.cancel()
            self.currentUpdateTask = self.createUpdateTask()
        }
    }

    private func createUpdateTask() -> Task<Void, Never> {
        Task { [weak self] in
            guard let self else { return }

            await self.debouncer.debounce { [weak self] in
                guard let self else { return }
                await self.performUpdate()
            }
        }
    }

    private func performUpdate() async {
        let progress = Progress(totalUnitCount: 4)

        let updateId: Int = locked(self.lk) {
            self.hasPendingUpdates = false
            self.updateCounter += 1
            return self.updateCounter
        }

        LogInfo("Safari filters update started (ID: \(updateId))")

        do {
            // Wrap the entire update in a cancellation handler so that
            // progress.cancel() fires immediately when debounceTask is cancelled,
            // even if the code is deep inside SafariConverter's Task.detached.
            try await withTaskCancellationHandler {
                try self.checkCancellation(progress)

                // Stage 1: Get filters for conversion

                var rawFilters = self.filterListManager.getActiveRulesInfo()

                try self.checkCancellation(progress)

                if !self.userSettingsService.languageSpecific {
                    rawFilters = rawFilters.filter { filter in
                        filter.groupId != FiltersDefinedGroup.languageSpecific.id
                    }
                }

                progress.completedUnitCount += 1

                try self.checkCancellation(progress)

                // Stage 2: Reset converted filters storage

                self.safariFiltersStorage.resetStorage()
                progress.completedUnitCount += 1

                try self.checkCancellation(progress)

                // Stage 3: Convert rules and save

                let updatedBlockers = self.safariConverter.convertRulesAndSave(
                    filters: rawFilters,
                    advanced: self.userSettingsService.advancedBlockingState.advancedRules,
                    progress: progress
                )
                progress.completedUnitCount += 1

                try self.checkCancellation(progress)

                // Stage 4: Reload content blockers

                var blockersToReload: [SafariConversionResult] = []
                for await blocker in updatedBlockers {
                    blockersToReload.append(blocker)
                }

                try self.checkCancellation(progress)

                await withTaskGroup(of: Void.self) { group in
                    for blocker in blockersToReload {
                        group.addTask {
                            let blockerType = blocker.blockerType
                            LogDebug("Blocker \(blockerType) conversion info: \(blocker.conversionInfo)")
                            await self.safariExtensionManager.reloadContentBlocker(blockerType)
                        }
                    }
                }

                progress.completedUnitCount += 1

                LogInfo("Safari filters update ended (ID: \(updateId))")
            } onCancel: {
                progress.cancel()
            }
        } catch is CancellationError {
            LogInfo("Safari filters update was cancelled (ID: \(updateId))")
        } catch {
            LogError("Safari filters update failed (ID: \(updateId)): \(error)")
        }
    }
}
