// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailFiltersUpdater.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - Constants

private enum Constants {
    /// 1-second debounce, matching SafariFiltersUpdater.
    static let debounceTime: TimeInterval = 1.second
}

/// Regenerates the Mail Tracking Protection ruleset and reloads the MailKit
/// extension. Starts, stops, and debounces update requests.
protocol MailFiltersUpdater: RestartableService {
    func updateMailFilters()
}

// MARK: - MailFiltersUpdaterImpl

final class MailFiltersUpdaterImpl: RestartableServiceBase, MailFiltersUpdater {
    private let converter: MailRulesetConverting
    private let ruleProvider: MailRuleProvider
    private let licenseProvider: MailPremiumStatusProvider
    private let reloader: MailExtensionReloader
    private let protectionProvider: MailProtectionStatusProvider
    private let extensionStateService: MailExtensionStateService

    private var currentUpdateTask: Task<Void, Never>?

    private let debouncer = Debouncer(debounceTimeSeconds: Constants.debounceTime)
    private var hasPendingUpdates = false
    private var updateCounter = 0
    private let lk = UnfairLock()

    init(
        converter: MailRulesetConverting,
        ruleProvider: MailRuleProvider,
        licenseProvider: MailPremiumStatusProvider,
        reloader: MailExtensionReloader,
        protectionProvider: MailProtectionStatusProvider,
        extensionStateService: MailExtensionStateService
    ) {
        self.converter = converter
        self.ruleProvider = ruleProvider
        self.licenseProvider = licenseProvider
        self.reloader = reloader
        self.protectionProvider = protectionProvider
        self.extensionStateService = extensionStateService
        super.init()
    }

    override func start() {
        var hasPending = false
        locked(self.lk) {
            super.start()
            hasPending = self.hasPendingUpdates
        }
        if hasPending {
            self.updateMailFilters()
        }
    }

    func updateMailFilters() {
        locked(self.lk) {
            guard self.isStarted else {
                self.hasPendingUpdates = true
                return
            }
            if let currentTask = self.currentUpdateTask, !currentTask.isCancelled {
                currentTask.cancel()
            }
            self.currentUpdateTask = self.createConvertTask()
        }
    }

    private func createConvertTask() -> Task<Void, Never> {
        Task { [weak self] in
            await self?.debouncer.debounce { [weak self] in
                guard let self else { return }
                await self.convert()
            }
        }
    }

    /// One conversion→reload→log cycle. Internal so tests drive it directly,
    /// without debounce timing.
    func convert() async {
        self.hasPendingUpdates = false

        self.updateCounter += 1
        let updateId = self.updateCounter
        LogInfo("Mail filters update started (ID: \(updateId))")

        await self.extensionStateService.setLoading(true)

        let isEnabled = self.protectionProvider.mailProtection
        let isPremium = await self.licenseProvider.isPremiumActive()
        let filterRules = await self.ruleProvider.mailFilterRules()
        let userRules = await self.ruleProvider.enabledUserRules()

        let result = await self.converter.convert(
            isEnabled: isEnabled,
            isPremium: isPremium,
            filterRules: filterRules,
            userRules: userRules
        )

        // The generation outcome has no entry-count field.
        // Populated outcomes log converter errors; empty outcomes publish `[]`.
        switch result.outcome {
        case .populated:
            LogInfo(
                "\(LogTag.mail) generate end (ID: \(updateId)): " +
                "outcome=populated, converterErrors=\(result.converterErrorCount), " +
                "written=\(result.writtenSuccessfully)"
            )
        case .disabled, .nonPremium:
            LogInfo(
                "\(LogTag.mail) generate end (ID: \(updateId)): " +
                "outcome=\(result.outcome), entries=0, " +
                "written=\(result.writtenSuccessfully)"
            )
        }

        await self.updateExtensionState(result: result)

        let reloadSuccess = await self.reloader.reload()
        if reloadSuccess {
            LogInfo("\(LogTag.mail) reloadContentBlocker end (ID: \(updateId))")
        } else {
            LogError("\(LogTag.mail) reloadContentBlocker end (ID: \(updateId))")
        }

        await self.extensionStateService.setLoading(false)

        LogInfo("Mail filters update ended (ID: \(updateId))")
    }

    /// Maps the conversion result to a `MailExtension.State` and persists it.
    private func updateExtensionState(result: MailRulesetConversionResult) async {
        let rulesInfo = MailConversionInfo(
            sourceRulesCount: result.sourceRulesCount,
            jsonEntriesCount: result.jsonEntriesCount,
            discardedRules: result.discardedRules,
            errorsCount: result.converterErrorCount
        )

        let status: MailExtension.Status
        switch result.outcome {
        case .disabled, .nonPremium:
            status = .unknown
        case .populated:
            if !result.writtenSuccessfully {
                status = .writeError
            } else if result.converterErrorCount > 0 {
                status = .converterError
            } else if result.discardedRules > 0 {
                status = .limitExceeded
            } else {
                status = .ok
            }
        }

        await self.extensionStateService.updateState(
            .init(rulesInfo: rulesInfo, status: status)
        )
    }
}

// MARK: - MailFiltersUpdaterNoOp

/// A no-op implementation of ``MailFiltersUpdater``.
///
/// Remove this type and switch back to ``MailFiltersUpdaterImpl``
/// in ``ServiceLocator`` once MTP is ready for production.
final class MailFiltersUpdaterNoOp: RestartableServiceBase, MailFiltersUpdater {
    func updateMailFilters() {}
}
