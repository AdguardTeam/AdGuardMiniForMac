// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailExtensionStateStorage.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - MailExtensionStateStorage

protocol MailExtensionStateStorage {
    func checkIsInProgress() async -> Bool

    func setInProgress(_ inProgress: Bool) async

    func getState() async -> MailExtension.State

    @discardableResult
    func updateState(_ newState: MailExtension.State) async -> Bool
}

// MARK: - MailExtensionStateStorageImpl

/// Actor-backed implementation with UserDefaults persistence and an in-memory
/// cache, modelled on `SafariExtensionStateStorageImpl`.
actor MailExtensionStateStorageImpl {
    private var cachedState: MailExtension.State?
    private var isInProgressFlag = false

    @UserDefault(key: .mailExtensionState, defaultValue: nil)
    private var stateData: Data?

    private func loadState() -> MailExtension.State? {
        do {
            if let data = self.stateData {
                return try JSONDecoder().decode(MailExtension.State.self, from: data)
            }
        } catch {
            LogError("Error decoding mail extension state: \(error)")
        }
        return nil
    }
}

// MARK: - MailExtensionStateStorage implementation

extension MailExtensionStateStorageImpl: MailExtensionStateStorage {
    func checkIsInProgress() async -> Bool {
        self.isInProgressFlag
    }

    func setInProgress(_ inProgress: Bool) async {
        self.isInProgressFlag = inProgress
    }

    func getState() async -> MailExtension.State {
        if let cached = self.cachedState {
            return cached
        }
        let loaded = self.loadState() ?? .empty
        self.cachedState = loaded
        return loaded
    }

    @discardableResult
    func updateState(_ newState: MailExtension.State) async -> Bool {
        self.cachedState = newState
        do {
            let data = try JSONEncoder().encode(newState)
            self.stateData = data
            return true
        } catch {
            LogError("Error encoding mail extension state: \(error)")
            return false
        }
    }
}
