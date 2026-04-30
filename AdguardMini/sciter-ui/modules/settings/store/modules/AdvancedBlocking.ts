// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { GetAdvancedBlockingRequest, UpdateAdvancedBlockingRequest } from 'Apis/requests/AdvancedBlockingService';
import { AdvancedBlocking as AdvancedBlockingEnt, EmptyValue } from 'Apis/types';
import { withLast } from 'Common/utils/queue';

import type { SettingsStore } from 'SettingsStore';

/**
 *  AdvancedBlocking store
 */
export class AdvancedBlocking {
    rootStore: SettingsStore;

    /**
     * Advanced blocking settings
     */
    public advancedBlocking = new AdvancedBlockingEnt();

    /**
     * Ctor
     *
     * @param rootStore
     */
    public constructor(rootStore: SettingsStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this, {
            rootStore: false,
        }, { autoBind: true });
    }

    /**
     * Get AdvancedBlocking from swift
     */
    public async getAdvancedBlocking() {
        const resp = await window.API.Execute(new GetAdvancedBlockingRequest());
        this.setAdvancedBlocking(resp);
    }

    /**
     * private setter
     */
    private setAdvancedBlocking(data: AdvancedBlockingEnt) {
        this.advancedBlocking = data;
    }

    /**
     * Commit advanced blocking settings on platform-side
     */
    private readonly commitAdvancedBlocking = withLast<AdvancedBlockingEnt, EmptyValue>(
        async (data: AdvancedBlockingEnt) => {
            return window.API.Execute(new UpdateAdvancedBlockingRequest(data));
        },
        'commitAdvancedBlocking',
    );

    /**
     * Update AdvancedRules setting
     */
    public updateAdvancedRules(value: boolean) {
        const newValue = this.updateHelper();
        newValue.advancedRules = value;
        this.setAdvancedBlocking(newValue);
        this.commitAdvancedBlocking(newValue);
    }

    /**
     * Update AdguardExtra setting
     */
    public updateAdguardExtra(value: boolean) {
        // TODO: add premium check
        const newValue = this.updateHelper();
        newValue.adguardExtra = value;
        this.setAdvancedBlocking(newValue);
        this.commitAdvancedBlocking(newValue);
    }

    /**
     * private update helper
     */
    private updateHelper() {
        return new AdvancedBlockingEnt({
            advancedRules: this.advancedBlocking.advancedRules,
            adguardExtra: this.advancedBlocking.adguardExtra,
        });
    }
}
