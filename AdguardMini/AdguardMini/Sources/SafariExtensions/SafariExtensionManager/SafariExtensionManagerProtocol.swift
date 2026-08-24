// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionManagerProtocol.swift
//  AdguardMini
//

// MARK: - SafariExtensionManager

/// The object responsible for interacting with safari extensions.
protocol SafariExtensionManager {
    /// Reload specified content blocker.
    ///
    /// Also logs an error if an error occurs.
    /// - Parameter type: Blocker for reload.
    /// - Returns: True if the reload was successful, otherwise false.
    @discardableResult
    func reloadContentBlocker(_ type: SafariBlockerType) async -> Bool

    /// Reload all content blockers.
    ///
    /// Also logs an error if an error occurs.
    /// - Returns: True if the reload was successful, otherwise false.
    @discardableResult
    func reloadAllContentBlockers() async -> Bool

    /// Reload the given content blockers in parallel.
    ///
    /// Also logs an error if an error occurs.
    /// - Parameter types: The blockers to reload.
    /// - Returns: True if the reload was successful, otherwise false.
    @discardableResult
    func reloadContentBlockers(_ types: [SafariBlockerType]) async -> Bool
}
