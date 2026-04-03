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
}

// MARK: - StatisticsStoreImpl

final class StatisticsStoreImpl: StatisticsStore {
    // MARK: Private properties

    private let persistentContainer: NSPersistentContainer
    private let context: NSManagedObjectContext

    /// Reserved storage key for the deduplicated ads-blocked total record.
    ///
    /// This must not overlap with any `SafariBlockerType.rawValue`, because the
    /// same Core Data field stores both per-blocker rows and the ads-blocked total row.
    private static let adsBlockedTotalStorageKey = BlockingStatisticsKey.adsBlockedTotal

    // MARK: Init

    init() throws {
        let persistentContainer = NSPersistentContainer(name: "BlockingStatistics")

        if let description = persistentContainer.persistentStoreDescriptions.first {
            description.shouldMigrateStoreAutomatically = true
            description.shouldInferMappingModelAutomatically = true
        }

        do {
            let storeURL = try Self.loadPersistentStore(in: persistentContainer)
            LogInfo("StatisticsStore initialized at \(storeURL.path)")
        } catch {
            try Self.recoverPersistentStore(in: persistentContainer, after: error)
        }

        let context = persistentContainer.viewContext
        context.automaticallyMergesChangesFromParent = true

        self.persistentContainer = persistentContainer
        self.context = context
    }

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
                LogDebug(
                    "Updated ads-blocked total on \(today): \(existing.count - count64) + \(count) = \(existing.count)"
                )
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

            let blockerTypeDesc = blockerType.map { "blocker=\($0)" } ?? "all blockers"
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

            LogInfo("All statistics reset")
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
                LogError("Failed to load persistent Core Data store: \(error)")
            }
        }

        if let loadError {
            throw loadError
        }

        guard let loadedURL else {
            let error = StatisticsStoreError.failedToLoadStoreURL
            LogError("Persistent store loaded but URL is missing")
            throw error
        }

        return loadedURL
    }

    private static func recoverPersistentStore(in container: NSPersistentContainer, after error: Error) throws {
        guard let storeURL = container.persistentStoreDescriptions.first?.url else {
            LogError("Failed to load store and store URL is nil - cannot recover")
            throw StatisticsStoreError.failedToLoadStore(error)
        }

        LogError("Statistics store corrupted at \(storeURL.path). All accumulated statistics data will be lost. Original error: \(error)")

        do {
            try container.persistentStoreCoordinator.destroyPersistentStore(
                at: storeURL,
                ofType: NSSQLiteStoreType,
                options: nil
            )
            LogInfo("Destroyed corrupted persistent store")
        } catch {
            LogError("Failed to destroy persistent store: \(error)")
        }

        do {
            let recreatedStoreURL = try loadPersistentStore(in: container)
            LogInfo("Fresh StatisticsStore created successfully at \(recreatedStoreURL.path)")
        } catch {
            LogError("Failed to recreate statistics store: \(error)")
            throw StatisticsStoreError.failedToLoadStore(error)
        }
    }
}
