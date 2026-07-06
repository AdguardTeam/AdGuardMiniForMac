// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TrayStatistics.ts
//  AdguardMini
//

import { makeAutoObservable } from 'mobx';

import { GetStatisticsRequest } from 'Apis/requests/TrayService';
import { StatisticsPeriod, StatisticsResponse } from 'Apis/types';

/**
 * Tray statistics data management. Zero dependencies.
 */
export class TrayStatistics {
    /**
     * Statistics data
     */
    public statistics = new StatisticsResponse();

    /**
     * Ctor — self-initializes
     */
    constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
        this.getStatistics();
    }

    /**
     * Get statistics
     */
    public async getStatistics(): Promise<void> {
        const data = await window.API.Execute(new GetStatisticsRequest({
            period: StatisticsPeriod.all,
        }));
        this.setStatistics(data);
    }

    /**
     * Setter for statistics
     */
    public setStatistics(statistics: StatisticsResponse): void {
        this.statistics = statistics;
    }
}
