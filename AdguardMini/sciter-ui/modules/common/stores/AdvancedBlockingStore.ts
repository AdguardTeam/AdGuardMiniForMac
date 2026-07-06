// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AdvancedBlockingStore.ts
//  AdguardMini
//

import { makeAutoObservable } from 'mobx';

import { GetAdvancedBlockingRequest, UpdateAdvancedBlockingRequest } from 'Apis/requests/AdvancedBlockingService';
import { AdvancedBlocking as AdvancedBlockingEnt } from 'Apis/types';
import { withLast } from 'Common/utils/queue';

/**
 * Shared store for advanced blocking settings.
 * Used by settings AdvancedBlocking and tray TraySettings.
 */
export class AdvancedBlockingStore {
    /**
     * Update advanced rules toggle
     */
    private readonly updateAdvancedRulesRequest = withLast(async (data: AdvancedBlockingEnt) => {
        return window.API.Execute(new UpdateAdvancedBlockingRequest(data));
    }, 'advancedRules');

    /**
     * Update AdGuard Extra toggle
     */
    private readonly updateAdguardExtraRequest = withLast(async (data: AdvancedBlockingEnt) => {
        return window.API.Execute(new UpdateAdvancedBlockingRequest(data));
    }, 'adguardExtra');

    public advancedBlocking = new AdvancedBlockingEnt();

    /**
     * Ctor
     */
    constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
    }

    /**
     * Get advanced blocking status
     */
    public async getAdvancedBlocking(): Promise<void> {
        try {
            const resp = await window.API.Execute(new GetAdvancedBlockingRequest());
            this.setAdvancedBlocking(resp);
        } catch (err) {
            log.error('AdvancedBlockingStore.getAdvancedBlocking failed', String(err));
        }
    }

    /**
     * Update AdvancedRules setting (delegates)
     */
    public updateAdvancedRules(value: boolean): void {
        const newValue = this.advancedBlocking.clone();
        newValue.advancedRules = value;
        this.setAdvancedBlocking(newValue);
        this.updateAdvancedRulesRequest(newValue);
    }

    /**
     * Update AdguardExtra setting (delegates)
     */
    public updateAdguardExtra(value: boolean): void {
        // TODO: add premium check
        const newValue = this.advancedBlocking.clone();
        newValue.adguardExtra = value;
        this.setAdvancedBlocking(newValue);
        this.updateAdguardExtraRequest(newValue);
    }

    /**
     * Setter for advanced blocking
     */
    public setAdvancedBlocking(advancedBlocking: AdvancedBlockingEnt): void {
        this.advancedBlocking = advancedBlocking;
    }
}
