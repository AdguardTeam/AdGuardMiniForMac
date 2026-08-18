// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  EffectRunning.swift
//  PopupExtension
//

import Foundation

/// Abstraction over side-effect execution, injected into `PopupStore`.
protocol EffectRunning: Sendable {
    /// Execute a single effect; return a completion action (if any)
    /// to feed back into the store.
    func run(_ effect: Store.Effect) async -> Store.Action?

    /// Cancel all in-flight effect tasks (called on popup dismissal).
    func cancelAll()

    /// Register an external task for cancellation tracking.
    /// Called by `PopupStore` after creating a `Task` for an effect.
    func registerTask(_ task: Task<Void, Never>, for effect: Store.Effect)
}
