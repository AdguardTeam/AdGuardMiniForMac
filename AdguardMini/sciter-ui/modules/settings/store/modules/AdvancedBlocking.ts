// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import {
    GetAdvancedBlockingRequest,
    GetURLFilterStateRequest,
    MarkURLFilterInstallRequestedRequest,
    MarkURLFilterSeenRequest,
    UpdateAdvancedBlockingRequest,
    UpdateRealTimeFiltersUpdateRequest,
    UpdateURLFilterConfigurationRequest,
    ResetURLFilterCacheRequest,
    RemoveURLFilterRequest,
} from 'Apis/requests/AdvancedBlockingService';
import {
    AdvancedBlocking as AdvancedBlockingEnt,
    URLFilterConfiguration,
    URLFilterState,
} from 'Apis/types';
import { withLast } from 'Common/utils/queue';

import type { EmptyValue } from 'Apis/types';
import type { SettingsStore } from 'SettingsStore';

/**
 *  AdvancedBlocking store
 */
export class AdvancedBlocking {
    /**
     * Commit advanced blocking settings on platform-side
     */
    private readonly commitAdvancedBlocking = withLast<AdvancedBlockingEnt, EmptyValue>(
        async (data: AdvancedBlockingEnt) => {
            return window.API.Execute(new UpdateAdvancedBlockingRequest(data));
        },
        'commitAdvancedBlocking',
    );

    public rootStore: SettingsStore;

    /**
     * Advanced blocking settings
     */
    public advancedBlocking = new AdvancedBlockingEnt();

    /**
     * URL filter state for system-wide protection settings.
     */
    public urlFilterState = new URLFilterState({
        configuration: new URLFilterConfiguration({
            enabled: false,
        }),
        isNew: false,
        isPageNew: false,
    });

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
     * private update helper
     */
    private updateHelper() {
        return new AdvancedBlockingEnt({
            advancedRules: this.advancedBlocking.advancedRules,
            adguardExtra: this.advancedBlocking.adguardExtra,
        });
    }

    /**
     * private setter
     */
    private setAdvancedBlocking(data: AdvancedBlockingEnt) {
        this.advancedBlocking = data;
    }

    /**
     * URL filter state setter
     */
    public setURLFilterState(data: URLFilterState) {
        this.urlFilterState = data;
    }

    /**
     * Get AdvancedBlocking from swift
     */
    public async getAdvancedBlocking() {
        const resp = await window.API.Execute(new GetAdvancedBlockingRequest());
        this.setAdvancedBlocking(resp);
    }

    /**
     * Get URL filter state from swift
     */
    public async getURLFilterState() {
        const resp = await window.API.Execute(new GetURLFilterStateRequest());
        this.setURLFilterState(resp);
    }

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
     * Update realTimeFiltersUpdate setting
     */
    public updateRealTimeFiltersUpdate(data: boolean) {
        const newValue = this.updateHelper();
        newValue.realTimeFiltersUpdate = data;
        window.API.Execute(new UpdateRealTimeFiltersUpdateRequest({ value: data }));
        this.commitAdvancedBlocking(newValue);
    }

    /**
     * Update SystemWideProtection setting
     */
    public updateSystemWideProtection(value: URLFilterConfiguration) {
        const newConfiguration = new URLFilterConfiguration({
            enabled: value.enabled,
            protectionLevel: value.protectionLevel,
        });

        this.setURLFilterState(new URLFilterState({
            status: this.urlFilterState.status,
            configuration: newConfiguration,
            info: this.urlFilterState.info,
            errorMessage: this.urlFilterState.errorMessage,
            isNew: this.urlFilterState.isNew,
            isPageNew: this.urlFilterState.isPageNew,
        }));

        window.API.Execute(new UpdateURLFilterConfigurationRequest(newConfiguration));
    }

    /**
     * Installs system-wide protection with the given configuration.
     *
     * Marks the install as requested so the transient installing state is
     * surfaced while the platform filter is starting, then commits the
     * configuration which performs the actual URL filter installation.
     *
     * @param configuration Configuration to install; `enabled` must be `true`.
     */
    public installSystemWideProtection(configuration: URLFilterConfiguration) {
        this.markURLFilterInstallRequested();
        this.updateSystemWideProtection(configuration);
    }

    /**
     * Marks URL filter install process as requested.
     */
    public markURLFilterInstallRequested() {
        window.API.Execute(new MarkURLFilterInstallRequestedRequest());
    }

    /**
     * Resets URL filter prefilter cache.
     */
    public resetURLFilterCache() {
        window.API.Execute(new ResetURLFilterCacheRequest());
    }

    /**
     * Removes URL filter configuration.
     */
    public removeURLFilter() {
        window.API.Execute(new RemoveURLFilterRequest());
    }

    /**
     * Marks system-wide protection card as seen.
     */
    public markSystemWideProtectionAsSeen() {
        const { isPageNew } = this.urlFilterState;
        this.setURLFilterState(new URLFilterState({
            status: this.urlFilterState.status,
            configuration: this.urlFilterState.configuration,
            info: this.urlFilterState.info,
            errorMessage: this.urlFilterState.errorMessage,
            isNew: false,
            isPageNew,
        }));

        window.API.Execute(new MarkURLFilterSeenRequest({
            isNew: false,
            isPageNew,
        }));
    }

    /**
     * Marks system-wide protection page as seen.
     */
    public markSystemWideProtectionPageAsSeen() {
        const { isNew } = this.urlFilterState;
        this.setURLFilterState(new URLFilterState({
            status: this.urlFilterState.status,
            configuration: this.urlFilterState.configuration,
            info: this.urlFilterState.info,
            errorMessage: this.urlFilterState.errorMessage,
            isNew,
            isPageNew: false,
        }));

        window.API.Execute(new MarkURLFilterSeenRequest({
            isNew,
            isPageNew: false,
        }));
    }
}
