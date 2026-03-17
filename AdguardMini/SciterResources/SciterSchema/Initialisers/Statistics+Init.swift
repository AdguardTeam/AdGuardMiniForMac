// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Statistics+Init.swift
//  SciterSchema
//

import BaseSciterSchema

extension BlockerStatistics {
    public init(total: Int, privacy: Int) {
        self.init()
        self.total = Int64(total)
        self.privacy = Int64(privacy)
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
