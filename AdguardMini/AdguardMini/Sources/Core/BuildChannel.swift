// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  BuildChannel.swift
//  AdguardMini
//

import Foundation

// MARK: - BuildChannel

/// The build channel selected by `BuildConfig.AG_CHANNEL`.
enum BuildChannel: String {
    case release
    case beta
    case nightly
}
