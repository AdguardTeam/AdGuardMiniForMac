// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionManager.swift
//  AdguardMini
//

import Foundation
import SafariServices

import AML
import AMLC

// MARK: - SafariExtensionManagerImpl

final class SafariExtensionManagerImpl: SafariExtensionManager {
    private weak var delegate: ReloadExtensionDelegate?
    private let safariPopupApiClient: SafariPopupApi

    // MARK: Public methods

    init(delegate: ReloadExtensionDelegate, safariPopupApiClient: SafariPopupApi) {
        self.delegate = delegate
        self.safariPopupApiClient = safariPopupApiClient
    }

    @discardableResult
    func reloadContentBlocker(_ type: SafariBlockerType) async -> Bool {
        await self.onStartReload(type)

        if type == .advanced {
            return await self.reloadAdvancedBlocking()
        }

        let reloadStart = Date()
        LogInfo("\(LogTag.safari) reloadContentBlocker(\(type)) start")
        var result: Bool

        do {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                let exception = objcTryCatch {
                    SFContentBlockerManager.reloadContentBlocker(withIdentifier: type.bundleId) { error in
                        if let error {
                            continuation.resume(throwing: error)
                        } else {
                            continuation.resume()
                        }
                    }
                }
                if let exception {
                    let error = exception.transformAndLog(
                        domain: .safariServices,
                        file: #fileID,
                        function: #function,
                        line: #line
                    )
                    continuation.resume(throwing: error)
                }
            }
            LogInfo("\(LogTag.safari) reloadContentBlocker(\(type)) end, \(reloadStart.elapsedMs())")
            await self.onEndReload(type, error: nil)
            result = true
        } catch {
            LogError("\(LogTag.safari) reloadContentBlocker(\(type)) end (error: \(SafariError(error))), \(reloadStart.elapsedMs())")
            await self.onEndReload(type, error: error)
            result = false
        }

        return result
    }

    @discardableResult
    func reloadAllContentBlockers() async -> Bool {
        var numberOfFailed = 0
        for blockerType in SafariBlockerType.allCases {
            let isSuccess = await self.reloadContentBlocker(blockerType)
            numberOfFailed += isSuccess ? 0 : 1
        }
        return numberOfFailed == 0
    }

    private func reloadAdvancedBlocking() async -> Bool {
        await self.onEndReload(.advanced, error: nil)
        return true
    }

    private func onStartReload(_ type: SafariBlockerType) async {
        await self.delegate?.onStartReload(blockerType: type)
    }

    private func onEndReload(_ type: SafariBlockerType, error: Error?) async {
        await self.delegate?.onEndReload(
            .init(
                blockerType: type,
                error: error
            )
        )
    }
}
