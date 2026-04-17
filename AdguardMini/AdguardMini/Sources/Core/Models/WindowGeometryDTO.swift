// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WindowGeometryDTO.swift
//  AdguardMini
//

import Foundation

// swiftlint:disable identifier_name
struct WindowGeometryDTO: Codable, Equatable {
    let x: Int
    let y: Int
    let width: Int
    let height: Int
    let monitor: Int
}
// swiftlint:enable identifier_name
