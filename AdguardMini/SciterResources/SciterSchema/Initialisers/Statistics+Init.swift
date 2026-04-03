// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Statistics+Init.swift
//  SciterSchema
//

import BaseSciterSchema

extension BlockerStatistics {
    public init(adsBlocked: Int, privacyBlocked: Int) {
        self.init()
        self.adsBlocked = Int64(adsBlocked)
        self.privacyBlocked = Int64(privacyBlocked)
    }
}

// MARK: - StatisticsResponse

extension StatisticsResponse {
    public init(statistics: BlockerStatistics, period: StatisticsPeriod) {
        self.init()
        self.statistics = statistics
        self.period = period
    }
}
