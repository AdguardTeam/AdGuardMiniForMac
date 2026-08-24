// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Statistics+Init.swift
//  ProtoSchema
//

import BaseProtoSchema

extension BlockerStatistics {
    public init(adsBlocked: Int, privacyBlocked: Int) {
        self.init()
        self.adsBlocked = Int64(adsBlocked)
        self.privacyBlocked = Int64(privacyBlocked)
    }
}

// MARK: - StatisticsResponse

extension StatisticsResponse {
    public init(statistics: BlockerStatistics) {
        self.init()
        self.statistics = statistics
    }
}
