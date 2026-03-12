// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  DIContainer.swift
//  PopupExtension
//

import SafariServices
import AML

// MARK: - DIContainer

/// A class containing all the objects needed for the popup
///
/// - Note: Should be inited as soon as possible: it also configures the logger
@MainActor
final class DIContainer {
    // MARK: Singleton

    static let shared: DIContainer = DIContainer()

    // MARK: Public properties

    var toolbarHandler: ToolbarHandler { self.popupViewModel }
    let safariController: PopupViewController
    let advancedBlockerHandler: AdvancedBlockerHandler

    let safariApiInteractor: SafariApiInteractor
    let sharedSettingsStorage: SharedSettingsStorage = SharedSettingsStorageImpl()
    let mainAppDiscovery: MainAppDiscovery = MainAppDiscoveryImpl()
    let blockingStatsReporter: BlockingStatsReporter

    // MARK: Private properties

    private let safariApp: SafariApp = SafariAppImpl()
    private let validationStatePreparer: PopupStatePreparer

    private let popupViewModel: PopupView.ViewModel
    private let mainView: PopupView

    private var reporterTask: Task<Void, Never>?

    private let filtersStorage: FiltersStorage = {
        let fileManager = AMFileManagerImpl()
        let fileStorage = GroupFolderFileServiceImpl(fileManager: fileManager)
        return FiltersStorageImpl(fileStorage: fileStorage)
    }()

    // MARK: Init

    private init() {
        let subsystem = Subsystem.safariPopup
        LogConfig.setupSharedLogger(for: subsystem)
        SharedSentryUtilities.startSentryForPlugin(subsystem: subsystem)

        let safariApi = ExtensionSafariApiClientImpl()
        self.safariApiInteractor = SafariApiInteractorImpl(safariApi: safariApi)

        self.advancedBlockerHandler = AdvancedBlockerHandlerImpl(
            webExtension: WebExtensionDIContainer.shared.webExtension,
            sharedSettingsStorage: self.sharedSettingsStorage
        )

        self.validationStatePreparer = PopupStatePreparerImpl(
            safariApi: self.safariApiInteractor,
            safariApp: self.safariApp
        )

        self.popupViewModel = PopupView.ViewModel(
            safariApi: self.safariApiInteractor,
            advancedBlocker: self.advancedBlockerHandler,
            mainAppDiscovery: self.mainAppDiscovery,
            safariApp: self.safariApp,
            validationStatePreparer: self.validationStatePreparer
        )
        safariApi.delegate = self.popupViewModel
        self.mainView = PopupView(viewModel: self.popupViewModel)

        self.safariController = PopupViewController(mainView: self.mainView, viewModel: self.popupViewModel)

        self.popupViewModel.popupViewControllerDelegate = self.safariController

        self.blockingStatsReporter = BlockingStatsReporterImpl(safariApi: self.safariApiInteractor)
        self.reporterTask = Task {
            await self.blockingStatsReporter.start()
        }
    }
}
