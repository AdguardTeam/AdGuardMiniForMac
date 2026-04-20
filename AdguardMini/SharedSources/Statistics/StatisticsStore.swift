// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  StatisticsStore.swift
//  AdguardMini
//

import Foundation
import CoreData
import AML

// MARK: - StatisticsPeriod

enum StatisticsPeriod {
    case day
    case week
    case month
    case year
    case all

    func datePredicate(referenceDate: Date = Date(), calendar: Calendar = .current) -> NSPredicate? {
        guard let inclusiveDaysCount else {
            return nil
        }

        let today = calendar.startOfDay(for: referenceDate)
        let daysBeforeToday = inclusiveDaysCount - 1

        guard
            let start = calendar.date(byAdding: .day, value: -daysBeforeToday, to: today),
            let end = calendar.date(byAdding: .day, value: 1, to: today)
        else {
            LogError("Failed to build date predicate for period: \(self.displayName)")
            return nil
        }

        return NSPredicate(format: "date >= %@ AND date < %@", start as NSDate, end as NSDate)
    }

    private var inclusiveDaysCount: Int? {
        switch self {
        case .day:     1
        case .week:    7
        case .month:  30
        case .year:  365
        case .all:   nil
        }
    }
}

extension StatisticsPeriod: CustomStringConvertible {
    var description: String {
        self.displayName
    }

    var displayName: String {
        switch self {
        case .day:   "day"
        case .week:  "week"
        case .month: "month"
        case .year:  "year"
        case .all:   "all time"
        }
    }
}

// MARK: - StatisticsStore

protocol StatisticsStore {
    func addCounts(_ counts: [SafariBlockerType: Int]) throws
    func addAdsBlockedTotal(_ count: Int) throws
    func queryStatistics(for period: StatisticsPeriod, blockerType: SafariBlockerType?) throws -> Int
    func queryAdsBlockedTotal(for period: StatisticsPeriod) throws -> Int
    func resetAll() throws
}

extension StatisticsStore {
    func queryStatistics(for period: StatisticsPeriod) throws -> Int {
        try self.queryStatistics(for: period, blockerType: nil)
    }
}

// MARK: - StatisticsStoreError

enum StatisticsStoreError: Error {
    case failedToLoadStore(Error)
    case failedToLoadStoreURL
    case appGroupContainerUnavailable
}

// MARK: - NoOpStatisticsStore

/// A no-op statistics store used when the shared store is unavailable.
final class NoOpStatisticsStore: StatisticsStore {
    func addCounts(_ counts: [SafariBlockerType: Int]) throws {}
    func addAdsBlockedTotal(_ count: Int) throws {}
    func queryStatistics(for period: StatisticsPeriod, blockerType: SafariBlockerType?) throws -> Int { 0 }
    func queryAdsBlockedTotal(for period: StatisticsPeriod) throws -> Int { 0 }
    func resetAll() throws {}
}

// MARK: - SharedStatisticsStoreImpl

/// A `StatisticsStore` backed by Core Data in the shared App Group container.
///
/// Both the main app and PopupExtension create their own instance pointing at
/// the same SQLite file. SQLite's WAL mode ensures cross-process safety.
final class SharedStatisticsStoreImpl: StatisticsStore {
    // MARK: Private properties

    private let persistentContainer: NSPersistentContainer
    private let context: NSManagedObjectContext

    private static let modelName = "BlockingStatistics"
    private static let adsBlockedTotalStorageKey = BlockingStatisticsKey.adsBlockedTotal

    // MARK: Init

    /// Production initializer: loads the Core Data model from the calling
    /// target's bundle and places the SQLite file in the App Group container.
    init() throws {
        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: BuildConfig.AG_MAC_GROUP)
        else {
            let error = StatisticsStoreError.appGroupContainerUnavailable
            LogError("Cannot access App Group container for statistics store")
            throw error
        }

        let statisticsDir = containerURL.appendingPathComponent(
            FolderLocation.statistics.path,
            isDirectory: true
        )
        try FileManager.default.createDirectory(at: statisticsDir, withIntermediateDirectories: true)
        let storeURL = statisticsDir.appendingPathComponent("\(Self.modelName).sqlite")

        let persistentContainer = NSPersistentContainer(name: Self.modelName)

        let description = NSPersistentStoreDescription(url: storeURL)
        description.shouldMigrateStoreAutomatically = true
        description.shouldInferMappingModelAutomatically = true
        persistentContainer.persistentStoreDescriptions = [description]

        do {
            let loadedURL = try Self.loadPersistentStore(in: persistentContainer)
            LogInfo("SharedStatisticsStore initialized at \(loadedURL.path)")
        } catch {
            try Self.recoverPersistentStore(in: persistentContainer, storeURL: storeURL, after: error)
        }

        let context = persistentContainer.viewContext
        context.automaticallyMergesChangesFromParent = true

        self.persistentContainer = persistentContainer
        self.context = context
    }

    /// Test initializer: accepts a pre-configured container.
    init(persistentContainer: NSPersistentContainer) {
        let context = persistentContainer.viewContext
        context.automaticallyMergesChangesFromParent = true

        self.persistentContainer = persistentContainer
        self.context = context
    }

    // MARK: Public methods

    func addCounts(_ counts: [SafariBlockerType: Int]) throws {
        let today = Calendar.current.startOfDay(for: Date())

        try self.context.performAndWait {
            for (blockerType, count) in counts where count > 0 {
                let blockerTypeString = blockerType.rawValue
                let count64 = Int64(count)
                let fetchRequest: NSFetchRequest<DailyBlockCount> = DailyBlockCount.fetchRequest()
                fetchRequest.predicate = NSPredicate(
                    format: "date == %@ AND blockerType == %@",
                    today as NSDate,
                    blockerTypeString
                )
                fetchRequest.fetchLimit = 1

                let results = try self.context.fetch(fetchRequest)

                if let existing = results.first {
                    existing.count += count64
                    LogDebug("Updated stats for \(blockerType) on \(today): \(existing.count - count64) + \(count) = \(existing.count)")
                } else {
                    let newRecord = DailyBlockCount(context: self.context)
                    newRecord.date = today
                    newRecord.blockerType = blockerTypeString
                    newRecord.count = count64
                    LogDebug("Created stats for \(blockerType) on \(today): \(count)")
                }
            }

            if self.context.hasChanges {
                try self.context.save()
            }
        }
    }

    func addAdsBlockedTotal(_ count: Int) throws {
        let today = Calendar.current.startOfDay(for: Date())
        let count64 = Int64(count)

        try self.context.performAndWait {
            let fetchRequest: NSFetchRequest<DailyBlockCount> = DailyBlockCount.fetchRequest()
            fetchRequest.predicate = NSPredicate(
                format: "date == %@ AND blockerType == %@",
                today as NSDate,
                Self.adsBlockedTotalStorageKey
            )
            fetchRequest.fetchLimit = 1

            let results = try self.context.fetch(fetchRequest)

            if let existing = results.first {
                existing.count += count64
                LogDebug("Updated ads-blocked total on \(today): \(existing.count - count64) + \(count) = \(existing.count)")
            } else {
                let newRecord = DailyBlockCount(context: self.context)
                newRecord.date = today
                newRecord.blockerType = Self.adsBlockedTotalStorageKey
                newRecord.count = count64
                LogDebug("Created ads-blocked total on \(today): \(count)")
            }

            if self.context.hasChanges {
                try self.context.save()
            }
        }
    }

    func queryAdsBlockedTotal(for period: StatisticsPeriod) throws -> Int {
        try self.context.performAndWait {
            let fetchRequest: NSFetchRequest<DailyBlockCount> = DailyBlockCount.fetchRequest()

            let predicates = [
                period.datePredicate(),
                NSPredicate(format: "blockerType == %@", Self.adsBlockedTotalStorageKey)
            ].compactMap { $0 }

            fetchRequest.predicate = NSCompoundPredicate(andPredicateWithSubpredicates: predicates)

            let results = try context.fetch(fetchRequest)
            let total = results.reduce(Int64(0)) { partial, item in
                partial + item.count
            }
            LogDebug("Query ads-blocked total for period=\(period.displayName): \(results.count) records, total: \(total)")
            return Int(clamping: total)
        }
    }

    func queryStatistics(for period: StatisticsPeriod, blockerType: SafariBlockerType?) throws -> Int {
        try self.context.performAndWait {
            let fetchRequest: NSFetchRequest<DailyBlockCount> = DailyBlockCount.fetchRequest()

            let typePredicate: NSPredicate
            if let blockerType {
                typePredicate = NSPredicate(format: "blockerType == %@", blockerType.rawValue)
            } else {
                typePredicate = NSPredicate(
                    format: "blockerType IN %@",
                    SafariBlockerType.allCases.map { $0.rawValue }
                )
            }

            let predicates = [
                period.datePredicate(),
                typePredicate
            ].compactMap { $0 }

            if !predicates.isEmpty {
                fetchRequest.predicate = NSCompoundPredicate(andPredicateWithSubpredicates: predicates)
            }

            let results = try context.fetch(fetchRequest)
            let total = results.reduce(Int64(0)) { partial, item in
                partial + item.count
            }
            let blockerTypeDesc = blockerType?.rawValue ?? "all"
            LogDebug("Query stats for period=\(period.displayName), \(blockerTypeDesc): \(results.count) records, total: \(total)")
            return Int(clamping: total)
        }
    }

    func resetAll() throws {
        try self.context.performAndWait {
            let fetchRequest: NSFetchRequest<NSFetchRequestResult> = DailyBlockCount.fetchRequest()
            let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)

            try self.context.execute(deleteRequest)
            self.context.reset()

            LogInfo("All shared statistics reset")
        }
    }

    // MARK: Private methods

    private static func loadPersistentStore(in container: NSPersistentContainer) throws -> URL {
        var loadedURL: URL?
        var loadError: Error?

        container.loadPersistentStores { storeDescription, error in
            loadedURL = storeDescription.url
            if let error {
                loadError = error
                LogError("Failed to load shared persistent Core Data store: \(error)")
            }
        }

        if let loadError {
            throw loadError
        }

        guard let loadedURL else {
            let error = StatisticsStoreError.failedToLoadStoreURL
            LogError("Shared persistent store loaded but URL is missing")
            throw error
        }

        return loadedURL
    }

    private static func recoverPersistentStore(
        in container: NSPersistentContainer,
        storeURL: URL,
        after error: Error
    ) throws {
        LogError(
            "Shared statistics store corrupted at \(storeURL.path). "
            + "All accumulated statistics data will be lost. Original error: \(error)"
        )

        do {
            try container.persistentStoreCoordinator.destroyPersistentStore(
                at: storeURL,
                ofType: NSSQLiteStoreType,
                options: nil
            )
            LogInfo("Destroyed corrupted shared persistent store")
        } catch {
            LogError("Failed to destroy shared persistent store: \(error)")
        }

        do {
            let recreatedURL = try loadPersistentStore(in: container)
            LogInfo("Fresh SharedStatisticsStore created at \(recreatedURL.path)")
        } catch {
            LogError("Failed to recreate shared statistics store: \(error)")
            throw StatisticsStoreError.failedToLoadStore(error)
        }
    }
}
