// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WindowGeometryDTO+Utils.swift
//  AdguardMini
//

import Foundation
import SciterSchema

extension WindowGeometryDTO {
    func toProto() -> SciterSchema.WindowGeometry {
        SciterSchema.WindowGeometry(
            x: Int32(self.x),
            y: Int32(self.y),
            width: Int32(self.width),
            height: Int32(self.height),
            monitor: Int32(self.monitor)
        )
    }
}
