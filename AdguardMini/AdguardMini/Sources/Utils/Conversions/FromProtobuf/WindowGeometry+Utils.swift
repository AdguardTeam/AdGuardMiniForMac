// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WindowGeometry+Utils.swift
//  AdguardMini
//

import Foundation
import SciterSchema

extension SciterSchema.WindowGeometry {
    func toWindowGeometryDTO() -> WindowGeometryDTO {
        WindowGeometryDTO(
            x: Int(self.x),
            y: Int(self.y),
            width: Int(self.width),
            height: Int(self.height),
            monitor: Int(self.monitor)
        )
    }
}
