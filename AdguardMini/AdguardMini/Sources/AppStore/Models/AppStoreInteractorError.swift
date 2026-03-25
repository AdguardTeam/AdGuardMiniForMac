// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStoreInteractorError.swift
//  AdguardMini
//

enum AppStoreInteractorError: Error {
    case noReceipt
    case purchaseNotExists
    /// The transaction was sent to the backend but it returned a non-valid status
    /// (e.g. `expired` when a sandbox subscription exhausted its renewal limit).
    case invalidReceipt(status: String)
}
