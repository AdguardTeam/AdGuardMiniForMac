// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionStateService.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - SafariExtensionActivity

enum SafariExtensionActivity {
    case conversion(ProcessPhase)
    case reload(ProcessPhase)

    enum ProcessPhase {
        case start
        case end
    }

    enum DictKey: String {
        case state
        case activity
    }
}

// MARK: - ConversionStateDelegate

/// Delegate responsible for handling events that occur during the conversion of classic filters to Apple Safari format.
protocol ConversionStateDelegate: AnyObject {
    func onStartConversion(blockerType: SafariBlockerType) async
    func onEndConversion(_ result: SafariConversionResult) async
}

// MARK: - ReloadExtensionDelegate

/// Delegate responsible for handling events that occur during the conversion of classic filters to Apple Safari format.
protocol ReloadExtensionDelegate: AnyObject {
    func onStartReload(blockerType: SafariBlockerType) async
    func onEndReload(_ result: ReloadExtensionResult) async
}

// MARK: - SafariExtensionStateService

/// The object responsible for receiving conversion (see ``ConversionStateDelegate``)
/// and reload extensions (see ``ReloadExtensionDelegate``) events,
/// and sending the data to the Sciter application.
protocol SafariExtensionStateService: ConversionStateDelegate, ReloadExtensionDelegate {
    /// Get all extensions state.
    /// - Returns: The object of sending in a Sciter.
    func getAllExtensionsStatus() async -> CurrentExtensionsStates
}

// MARK: - SafariExtensionStateServiceImpl

final class SafariExtensionStateServiceImpl {
    private let eventBus: EventBus
    private let manager: SafariExtensionStatusManager
    private let storage: SafariExtensionStateStorage

    init(
        eventBus: EventBus,
        safariExtensionStatusManager: SafariExtensionStatusManager,
        safariExtensionStateStorage: SafariExtensionStateStorage
    ) {
        self.eventBus = eventBus
        self.manager = safariExtensionStatusManager
        self.storage = safariExtensionStateStorage
    }

    private func checkLoadingOrDisabled(blockerType: SafariBlockerType) async -> SafariExtension.Status? {
        if await self.storage.checkIsInProgress(blockerType) {
            .loading
        } else if await !self.manager.checkIfExtensionEnabled(blockerType) {
            .disabled
        } else {
            nil
        }
    }

    private func processState(
        _ type: SafariBlockerType,
        _ state: SafariExtension.State
    ) async -> SafariExtension.Status {
        if let status = await self.checkLoadingOrDisabled(blockerType: type) {
            status
        } else if let error = state.error {
            switch error {
            case .converterError:
                    .converterError
            case .safariError:
                    .safariError
            }
        } else if state.rulesInfo.overLimit, type != .advanced {
            .limitExceeded
        } else {
            .ok
        }
    }

    private func getCurrentState(blockerType: SafariBlockerType) async -> CurrentExtensionState {
        if let state = await self.storage.getState(blockerType) {
            let status = await self.processState(blockerType, state)
            return CurrentExtensionState(
                type: blockerType,
                status: status,
                state: SafariExtension.State(
                    rulesInfo: state.rulesInfo,
                    error: (status == .disabled || status == .loading) ? nil : state.error
                )
            )
        }

        let status = await self.checkLoadingOrDisabled(blockerType: blockerType) ?? .unknown
        return CurrentExtensionState(
            type: blockerType,
            status: status,
            state: .init(
                rulesInfo: .invalid,
                error: nil
            )
        )
    }

    private func onStartProcess(blockerType: SafariBlockerType, activity: SafariExtensionActivity) async {
        await self.storage.setInProgress(true, for: blockerType)
        self.eventBus.post(
            event: .safariExtensionUpdate,
            userInfo: [
                SafariExtensionActivity.DictKey.state: CurrentExtensionState.loadingStatus(blockerType),
                SafariExtensionActivity.DictKey.activity: activity
            ]
        )
    }

    private func onEndProcess(blockerType: SafariBlockerType, activity: SafariExtensionActivity) async {
        await self.storage.setInProgress(false, for: blockerType)
        let update = await self.getCurrentState(blockerType: blockerType)
        self.eventBus.post(
            event: .safariExtensionUpdate,
            userInfo: [
                SafariExtensionActivity.DictKey.state: update,
                SafariExtensionActivity.DictKey.activity: activity
            ]
        )
    }
}

// MARK: - SafariExtensionStateService

extension SafariExtensionStateServiceImpl: SafariExtensionStateService {
    func getAllExtensionsStatus() async -> CurrentExtensionsStates {
        CurrentExtensionsStates(
            general:  await self.getCurrentState(blockerType: .general),
            privacy:  await self.getCurrentState(blockerType: .privacy),
            social:   await self.getCurrentState(blockerType: .socialWidgetsAndAnnoyances),
            security: await self.getCurrentState(blockerType: .security),
            other:    await self.getCurrentState(blockerType: .other),
            custom:   await self.getCurrentState(blockerType: .custom),
            advanced: await self.getCurrentState(blockerType: .advanced)
        )
    }
}

// MARK: - ConversionStateDelegate implementation

extension SafariExtensionStateServiceImpl: ConversionStateDelegate {
    func onStartConversion(blockerType: SafariBlockerType) async {
        LogDebug("Conversion started: \(blockerType)")
        await self.onStartProcess(blockerType: blockerType, activity: .conversion(.start))
    }

    func onEndConversion(_ result: SafariConversionResult) async {
        LogDebug("Conversion ended: \(result.blockerType)")
        await self.updateInfo(result)
        await self.onEndProcess(blockerType: result.blockerType, activity: .conversion(.end))
    }

    @discardableResult
    private func updateInfo(_ result: SafariConversionResult) async -> SafariExtension.State {
        var conversionInfo: ConversionInfo?
        var extensionStateError: SafariExtension.State.ExtensionError?
        switch result.conversionInfo {
        case .success(let info):
            conversionInfo = info
        case .failure(.cancelled):
            LogDebug("Conversion of \(result.blockerType) was cancelled")
        case .failure(let error):
            LogError("Conversion of \(result.blockerType) failed: \(error)")
            extensionStateError = .converterError
        }
        let newState = SafariExtension.State(
            rulesInfo: conversionInfo ?? .invalid,
            error: extensionStateError
        )
        await self.storage.updateState(result.blockerType, newState)
        return newState
    }
}

// MARK: - ReloadExtensionDelegate implementation

extension SafariExtensionStateServiceImpl: ReloadExtensionDelegate {
    func onStartReload(blockerType: SafariBlockerType) async {
        LogDebug("Reload started: \(blockerType)")
        await self.onStartProcess(blockerType: blockerType, activity: .reload(.start))
    }

    func onEndReload(_ result: ReloadExtensionResult) async {
        LogDebug("Reload ended: \(result.blockerType)")
        await self.updateInfo(result)
        await self.onEndProcess(blockerType: result.blockerType, activity: .reload(.end))
    }

    @discardableResult
    private func updateInfo(_ result: ReloadExtensionResult) async -> SafariExtension.State {
        var conversionInfo: ConversionInfo = .empty
        var actualError: SafariExtension.State.ExtensionError?
        if let currentsState = await self.storage.getState(result.blockerType) {
            conversionInfo = currentsState.rulesInfo
            let storedError = currentsState.error
            if storedError == .converterError {
                actualError = storedError
            }
        }
        if let safariError = result.error,
           actualError != .converterError {
            actualError = .safariError("\(safariError)")
        }
        let newState = SafariExtension.State(
            rulesInfo: conversionInfo,
            error: actualError
        )
        await self.storage.updateState(result.blockerType, newState)
        return newState
    }
}
