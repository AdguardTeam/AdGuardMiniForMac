// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import {
    GetAdvancedBlockingRequest,
    GetURLFilterStateRequest,
    GetURLFilterSeenRequest,
    SetURLFilterEnabledRequest,
    UpdateURLFilterSeenRequest,
    UpdateURLFilterProtectionLevelRequest,
    UpdateAdvancedBlockingRequest,
    UpdateRealTimeFiltersUpdateRequest,
    ResetURLFilterCacheRequest,
    RemoveURLFilterRequest,
} from 'Apis/requests/AdvancedBlockingService';
import {
    AdvancedBlocking as AdvancedBlockingEnt,
    URLFilterState,
} from 'Apis/types';
import {
    NotificationContext,
    NotificationsQueueIconType,
    NotificationsQueueType,
} from 'Common/stores/NotificationsQueue';
import { withLast } from 'Common/utils/queue';
import {
    notifySingleActive,
} from 'Common/utils/urlFilterState';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';

import type { EmptyValue, URLFilterProtectionLevel } from 'Apis/types';
import type { NotificationsQueue } from 'Common/stores/NotificationsQueue';

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

    /**
     * Active URL-filter failure notification id used to deduplicate toasts.
     */
    private urlFilterCallFailedNotificationId: string | null = null;

    /**
     * Notifications queue used to surface error toasts.
     */
    private readonly notification: NotificationsQueue;

    /**
     * Advanced blocking settings
     */
    public advancedBlocking = new AdvancedBlockingEnt();

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
        makeAutoObservable(this, undefined, { autoBind: true });
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
     * URL filter state setter
     */
    public setURLFilterSeen(data: boolean) {
        this.urlFilterNew = data;
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
     * Get URL filter state from swift
     */
    public async getURLFilterSeen() {
        const resp = await window.API.Execute(new GetURLFilterSeenRequest());
        this.setURLFilterSeen(resp.value);
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
