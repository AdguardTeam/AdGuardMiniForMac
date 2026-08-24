// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SettingsExport.swift
//  Adguard
//

import Cocoa

import AML
import FLM

// MARK: DECLARATION -

// MARK: - Constants

private enum Constants {
    static let defaultFileExt = ".txt"
    static let settingsFileName = "settings.json"
    static let filtersFileName = "filters.json"
    static let versionFileName = "version.json"
    static let archiveExt = BuildConfig.AG_EXCHANGE_SETTINGS_FILE_EXTENSION

    static let userFilterId = FLM.constants.userRulesId
}

// MARK: Protocols for APIs, which Export uses for getting data

/// Service protocol, which export procedure use, common API.
protocol SettingsExportBaseApiService {
    /// Returns app bundle id.
    func bundleId() -> String
    /// Returns group bundle id.
    func groupBundleId() -> String
}

/// Service protocol, which export procedure use,  blocking filters API.
protocol SettingsExportBlockingFilterApiService {
    /// Returns all blocking filters metadata or nil on failure.
    func filters() async -> [FilterMetaDTO]
    /// Returns blocking filter rules or nil on failure.
    /// - Parameter filterId: Blocking filter ID.
    func rules(for filterId: Int) async -> [FilterRuleDTO]
}

protocol SettingsExportApiService:
    SettingsExportBaseApiService,
    SettingsExportBlockingFilterApiService {}

// MARK: SettingsExport Interface

/// Objective C compatible SettingsExport errors.
enum SettingsExportError: ConvertableError {
    case compress
    case createExportFolder(Error)
    case invalidFilename(String)
    case createFile
    case fatal
}

/// SettingsExport public interface.
protocol SettingsExportProtocol {
    init(api: SettingsExportApiService)
    /// Starts export process.
    /// - Parameters:
    ///   - fileUrl: AdGuard settings file URL (target url).
    ///   - parentProgress: Parent `Progress` object if exists.
    ///   - completion: Performs when export process completed (asynchronously).
    /// - Returns: Returns Progress object for controlling export process, which possibles canceling of the export.
    func export(
        to fileUrl: URL,
        progress parentProgress: Progress?
    ) async -> Result<URL, Error>
}

extension SettingsExportProtocol {
    func export(to fileUrl: URL) async -> Result<URL, Error> {
        await self.export(to: fileUrl, progress: nil)
    }
}

// MARK: - IMPLEMENTATION -

// MARK: SettingsExport Implementation

/// Service for exporting of the app settings.
final class SettingsExport: NSObject, SettingsExportProtocol {
    // MARK: Private properties

    private let apiService: SettingsExportApiService

    // MARK: Public

    init(api: SettingsExportApiService) {
        self.apiService = api
    }

    func export(
        to fileUrl: URL,
        progress parentProgress: Progress? = nil
    ) async -> Result<URL, Error> {
        let progress = Progress(totalUnitCount: 100)
        progress.localizedDescription = "Exporting AdGuard Settings"
        progress.kind = ProgressKind("AdGuard settings export to file")
        parentProgress?.addChild(progress, withPendingUnitCount: 1)

        let result: Result<URL, Error> = await Task.detached {
            var buildFolder: URL
            do {
                buildFolder = try FileManager.createBuildFolder()
            } catch {
                return .failure(SettingsExportError.createExportFolder(error))
            }

            // UndoManager is main-actor-isolated in the modern SDK. The group
            // Is opened here (and closed below) on the main actor, while the
            // `defer` only cleans up the build folder (it cannot `await`).
            await MainActor.run {
                progress.undoManager.beginUndoGrouping()
            }

            defer {
                // Delete build folder
                try? FileManager.default.removeItem(at: buildFolder)
                LogInfo("Temp folder removed: \(buildFolder.path)")
            }

            LogInfo("AdGuard settings export started")
            LogInfo("AdGuard settings export destination: \(fileUrl.path)")
            LogInfo("AdGuard settings export build folder: \(buildFolder.path)")

            let outcome: Result<URL, Error>
            do {
                try self.preferences(folderUrl: buildFolder, progress: progress)
                if progress.isCancelled {
                    throw ExchangeSettingsModelError.canceled
                }

                try await self.blockingFilters(folderUrl: buildFolder, progress: progress)
                if progress.isCancelled {
                    throw ExchangeSettingsModelError.canceled
                }

                try self.compressFolder(buildFolder, targetUrl: fileUrl)
                outcome = .success(fileUrl)
            } catch {
                outcome = .failure(error)
            }

            await MainActor.run {
                progress.undoManager.endUndoGrouping()
            }
            return outcome
        }.value

        switch result {
        case .success:
            await MainActor.run {
                progress.undoManager.removeAllActions()
            }
            LogInfo("AdGuard Mini settings export finished")
        case .failure(let error):
            await MainActor.run {
                progress.undoManager.undo()
            }
            if !(error is SettingsExportError) {
                LogError("Error occurred: \(error)")
            }
        }

        return result
    }

    // MARK: Private Methods

    private func compressFolder(_ url: URL, targetUrl: URL) throws {
        let compressUrl = SystemUtil.compressFolder(
            folderUrl: url,
            ext: Constants.archiveExt,
            onlyContents: true
        )

        if let compressUrl {
            try FileManager.default.moveItem(at: compressUrl, to: targetUrl)
        }
    }
}

// MARK: Export entities implementation

extension SettingsExport {
    private func preferences(folderUrl: URL, progress: Progress) throws {
        let bundleId = self.apiService.bundleId()
        let groupId = self.apiService.groupBundleId()

        guard let defs = UserDefaults().persistentDomain(forName: bundleId)
        else { return }

        let sharedDefs: [String: Any]
        if let defs = UserDefaults().persistentDomain(forName: groupId) {
            sharedDefs = defs
        } else {
            LogWarn("Shared defaults does not exists. Proceeding with app level defs only")
            sharedDefs = [:]
        }

        let prefs = try defs
            .merging(sharedDefs) { appLevelPrefs, _ in appLevelPrefs }
            .mapKeys { $0.lowercasedFirstLetter() }

        let manifest = ExchangeSettingsModelManifest(settingsType: .preferences)
        let model = try ExchangeSettingsModel.Preferences(plist: prefs, progress: progress)
        try self.save(manifest: manifest, model: model, url: folderUrl, isFolderUrl: true, progress: progress)

        LogInfo("Exporting preferences finished")
    }

    private func blockingFilters(folderUrl: URL, progress: Progress) async throws {
        let filters = await self.apiService.filters()

        guard !filters.isEmpty else { return }

        let subfolderUrl = folderUrl.appendingPathComponent(
            ExchangeSettings.blockingFiltersSubfolderName,
            isDirectory: true
        )
        try FileManager.default.createDirectory(at: subfolderUrl, withIntermediateDirectories: true)

        let manifest = ExchangeSettingsModelManifest(settingsType: .blockingFilters)

        for item in filters {
            let filterId = item.filterId

            if progress.isCancelled {
                return
            }

            let isUserFilter = filterId == Constants.userFilterId
            let isCustomFilter = item.isCustom ?? false
            let isIndexFilter = !(isUserFilter || isCustomFilter)

            var item = item.clearingTags()
            if isCustomFilter {
                item = item.customFilterImportantData()
            } else if isIndexFilter {
                item = item.indexFilterImportantData()
            }

            // swiftlint:disable:next discouraged_optional_collection
            var rules: [FilterRuleDTO]? = await self.apiService.rules(for: filterId)

            if isIndexFilter {
                // For the index filters no export rules
                rules = nil
            }

            let dto = FilterDTO(
                meta: item,
                rules: rules
            )

            let model = try ExchangeSettingsModel.BlockingFilter(dto: dto, progress: progress)
            let fileUrl = subfolderUrl.appendingPathComponent("\(model.filterId).\(ExchangeSettings.jsonExtension)")

            try self.save(manifest: manifest, model: model, url: fileUrl, isFolderUrl: false, progress: progress)
        }
    }
}

// MARK: Save representation implementation

extension SettingsExport {
    private func save(
        manifest: ExchangeSettingsModelManifest,
        model: any ExchangeSettingsItemModel,
        url: URL,
        isFolderUrl: Bool = true,
        progress: Progress?
    ) throws {
        let fileUrl = isFolderUrl
        ? url
            .appendingPathComponent(manifest.settingsType.rawValue)
            .appendingPathExtension(ExchangeSettings.jsonExtension)
        : url

        LogInfo("Exporting to file: \(fileUrl.path)")

        let encoder = JSONEncoder()
        encoder.dataEncodingStrategy = ExchangeSettings.dataEncodingStrategy
        encoder.dateEncodingStrategy = ExchangeSettings.dateEncodingStrategy
        encoder.outputFormatting = ExchangeSettings.dateEncodingOutFormat

        let manifest = try encoder.encode(manifest)
        let payloadData = try model.data(progress: progress)

        if progress?.isCancelled ?? false {
            throw ExchangeSettingsModelError.canceled
        }
        guard FileManager.default.createFile(atPath: fileUrl.path, contents: nil) else {
            throw SettingsExportError.createFile.log()
        }

        let file = try FileHandle(forWritingTo: fileUrl)
        file.write(Data("{\n\"\(ExchangeSettings.ManifestCodableKey)\": ".utf8))
        file.write(manifest)
        file.write(Data(",\n\"\(ExchangeSettings.PayloadCodableKey)\": ".utf8))
        file.write(payloadData)
        file.write(Data("\n}".utf8))
        file.closeFile()

        LogInfo("Exporting \(fileUrl.path) finished")
    }
}

// MARK: SettingsExportError Implementation

extension SettingsExportError {
    static var errorDomain: String = "SettingsExportErrorDomain"

    var errorDescription: String? {
        switch self {
        case .compress:
            "compress"
        default:
            "unknown"
        }
    }

    var errorDebugDescription: String? {
        switch self {
        case .compress:
            return "Can't compress settings folder into archive"
        case .createExportFolder(let error):
            return "Can't create temp folder for exporting: \(error)"
        case .invalidFilename(let name):
            return "Filename '\(name)' contains prohibited characters and is failed to be encoded"
        case .createFile:
            return "Can't create file for export"
        case .fatal:
            return "Silent accert. It shouldn't have happened because it can't be."
        }
    }
}
