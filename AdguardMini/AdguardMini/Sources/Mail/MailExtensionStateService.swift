// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailExtensionStateService.swift
//  AdguardMini
//

import Foundation

// MARK: - MailExtensionStateService

protocol MailExtensionStateService {
    func getState() async -> MailExtension.State

    @discardableResult
    func updateState(_ newState: MailExtension.State) async -> Bool

    func setLoading(_ loading: Bool) async
}

// MARK: - MailExtensionStateServiceImpl

final class MailExtensionStateServiceImpl {
    private let storage: MailExtensionStateStorage

    init(storage: MailExtensionStateStorage) {
        self.storage = storage
    }
}

// MARK: - MailExtensionStateService implementation

extension MailExtensionStateServiceImpl: MailExtensionStateService {
    func getState() async -> MailExtension.State {
        await self.storage.getState()
    }

    @discardableResult
    func updateState(_ newState: MailExtension.State) async -> Bool {
        await self.storage.updateState(newState)
    }

    func setLoading(_ loading: Bool) async {
        await self.storage.setInProgress(loading)
    }
}
