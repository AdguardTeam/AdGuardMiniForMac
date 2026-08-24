// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppInfo+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension AppInfo {
    public init(
        version: String = "",
        channel: Channel = .unknown,
        dependencies: [ThirdPartyDependency] = [],
        updateAvailable: Bool = false
    ) {
        self.init()
        self.version = version
        self.channel = channel
        self.dependencies = dependencies
        self.updateAvailable = updateAvailable
    }
}
