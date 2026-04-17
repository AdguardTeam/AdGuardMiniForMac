// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Settings+Utils.swift
//  SciterSchema
//

import Foundation
import BaseSciterSchema

extension WindowGeometry {
    public init(
        x: Int32 = 0,
        y: Int32 = 0,
        width: Int32 = 0,
        height: Int32 = 0,
        monitor: Int32 = 0
    ) {
        self.init()
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.monitor = monitor
    }
}
