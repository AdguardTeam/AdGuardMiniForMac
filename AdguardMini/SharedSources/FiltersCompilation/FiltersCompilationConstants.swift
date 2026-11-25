// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FiltersCompilationConstants.swift
//  AdguardMini
//

/// Mirrors the filters registry `EXTENSION_SAFARI` defines; a token missing here makes FLM drop its `!#if` block.
enum FiltersCompilationConstants {
    static let all = ["adguard", "adguard_ext_safari"]
}
