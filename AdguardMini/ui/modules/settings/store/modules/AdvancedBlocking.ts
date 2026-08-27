// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable, flow } from 'mobx';

import {
    GetURLFilterStateRequest,
    GetURLFilterSeenRequest,
    SetURLFilterEnabledRequest,
    UpdateURLFilterSeenRequest,
    UpdateURLFilterProtectionLevelRequest,
    UpdateRealTimeFiltersUpdateRequest,
    ResetURLFilterCacheRequest,
    RemoveURLFilterRequest,
    GetRealTimeFiltersUpdateRequest,
    GetAdguardExtraRequest,
    GetAdvancedRulesRequest,
    UpdateAdvancedRulesRequest,
    UpdateAdguardExtraRequest,
} from 'Apis/requests/AdvancedBlockingService';
import {
    URLFilterState,
} from 'Apis/types';
import {
    NotificationContext,
    NotificationsQueueIconType,
    NotificationsQueueType,
} from 'Common/stores/NotificationsQueue';
import {
    notifySingleActive,
} from 'Common/utils/urlFilterState';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';

import type { BoolValue, URLFilterProtectionLevel } from 'Apis/types';
import type { NotificationsQueue } from 'Common/stores/NotificationsQueue';

/**
 *  AdvancedBlocking store
 */
export class AdvancedBlocking {
    /**
     * Active URL-filter failure notification id used to deduplicate toasts.
     */
    private urlFilterCallFailedNotificationId: string | null = null;

    /**
     * Notifications queue used to surface error toasts.
     */
    private readonly notification: NotificationsQueue;


    /**
     * Advanced rules state
     */
    public advancedRules = false;

    /**
     * AdGuard Extra state
     */
    public adguardExtra = false;

    /**
     * Real-time filters update state
     */
    public realTimeFiltersUpdate = false;

    /**
     * URL filter state for system-wide protection settings.
     */
    public urlFilterState = new URLFilterState();

    /**
     * URL filter seen.
     */
    public urlFilterNew = false;

    /**
     * Ctor
     *
     * @param notification Notifications queue used to surface error toasts.
     */
    public constructor(notification: NotificationsQueue) {
        this.notification = notification;
        makeAutoObservable(this, {
            getAdvancedRules: flow,
            getAdguardExtra: flow,
            getRealTimeFiltersUpdate: flow,
        }, { autoBind: true });
    }

    /**
     * Shows a generic warning when a System-wide Protection backend call fails.
     */
    private notifyURLFilterCallFailed(canNotEnable?: boolean) {
        this.urlFilterCallFailedNotificationId = notifySingleActive(
            this.urlFilterCallFailedNotificationId,
            this.notification,
            {
                message: canNotEnable ? translate('advanced.blocking.system.wide.error') : getNotificationSomethingWentWrongText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
                onClose: () => {
                    this.urlFilterCallFailedNotificationId = null;
                },
            },
        );
    }


    /**
     * URL filter state setter
     */
    public setURLFilterState(data: URLFilterState) {
        this.urlFilterState = data;
    }

    /**
     * URL filter state setter
     */
    public setURLFilterSeen(data: boolean) {
        this.urlFilterNew = data;
    }

    /**
     * Get all advanced blocking settings from swift
     */
    public getAdvancedBlocking() {
        this.getAdguardExtra();
        this.getAdvancedRules();
        this.getRealTimeFiltersUpdate();
    }

    /**
     * Get advancedRules state
     */
    public *getAdvancedRules() {
        const resp: BoolValue = yield window.API.Execute(new GetAdvancedRulesRequest());
        this.advancedRules = resp.value;
    }

    /**
     * Get adguardExtra state
     */
    public *getAdguardExtra() {
        const resp: BoolValue = yield window.API.Execute(new GetAdguardExtraRequest());
        this.adguardExtra = resp.value;
    }

    /**
     * Get realTimeFiltersUpdate state
     */
    public *getRealTimeFiltersUpdate() {
        const resp: BoolValue = yield window.API.Execute(new GetRealTimeFiltersUpdateRequest());
        this.realTimeFiltersUpdate = resp.value;
    }


    /**
     * Update AdvancedRules setting
     */
    public *updateAdvancedRules(value: boolean) {
        this.advancedRules = value;
        window.API.Execute(new UpdateAdvancedRulesRequest({ value }));
    }

    /**
     * Update AdguardExtra setting
     */
    public *updateAdguardExtra(value: boolean) {
        this.adguardExtra = value;
        window.API.Execute(new UpdateAdguardExtraRequest({ value }));
    }

    /**
     * Update realTimeFiltersUpdate setting
     */
    public *updateRealTimeFiltersUpdate(value: boolean) {
        this.realTimeFiltersUpdate = value;
        window.API.Execute(new UpdateRealTimeFiltersUpdateRequest({ value }));
    }

    /**
     * Get URL filter state from swift
     */
    public async getURLFilterState() {
        const resp = await window.API.Execute(new GetURLFilterStateRequest());
        this.setURLFilterState(resp);
    }

    /**
     * Get URL filter state from swift
     */
    public async getURLFilterSeen() {
        const resp = await window.API.Execute(new GetURLFilterSeenRequest());
        this.setURLFilterSeen(resp.value);
    }

    /**
     * Update SystemWideProtection switch setting
     */
    public async updateSystemWideProtection(value: boolean) {
        const newValue = this.urlFilterState.clone();
        const prevValue = this.urlFilterState.clone();
        newValue.enabled = value;
        this.setURLFilterState(newValue);
        const resp = await window.API.Execute(new SetURLFilterEnabledRequest({ value }));
        if (resp.hasError) {
            this.notifyURLFilterCallFailed(true);
            this.setURLFilterState(prevValue);
            this.getURLFilterState();
        }
    }

    /**
     * Update level of protection for SystemWideProtection setting
     */
    public async updateSystemWideProtectionLevel(protectionLevel: URLFilterProtectionLevel) {
        const newValue = this.urlFilterState.clone();
        const prevValue = this.urlFilterState.clone();
        newValue.protectionLevel = protectionLevel;
        this.setURLFilterState(newValue);
        const resp = await window.API.Execute(new UpdateURLFilterProtectionLevelRequest({ protectionLevel }));
        if (resp.hasError) {
            this.notifyURLFilterCallFailed(true);
            this.setURLFilterState(prevValue);
            this.getURLFilterState();
        }
    }

    /**
     * Resets URL filter prefilter cache.
     */
    public async resetURLFilterCache() {
        const resp = await window.API.Execute(new ResetURLFilterCacheRequest());
        if (resp.hasError) {
            this.getURLFilterState();
            this.notifyURLFilterCallFailed();
        }
    }

    /**
     * Removes URL filter configuration.
     */
    public async removeURLFilter() {
        const resp = await window.API.Execute(new RemoveURLFilterRequest());
        if (resp.hasError) {
            this.getURLFilterState();
            this.notifyURLFilterCallFailed();
        }
    }

    /**
     * Marks system-wide protection card as seen.
     */
    public updateURLFilterSeen(value: boolean) {
        this.setURLFilterSeen(value);
        window.API.Execute(new UpdateURLFilterSeenRequest({ value }));
    }
}
