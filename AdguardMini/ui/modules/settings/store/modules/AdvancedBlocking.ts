// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable, flow } from 'mobx';

import {
    GetURLFilterStateRequest,
    GetURLFilterSeenRequest,
    SetURLFilterEnabledRequest,
    UpdateURLFilterSeenRequest,
    RequestUpdateURLFilterProtectionLevelRequest,
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

import type { BoolValue, URLFilterInfo, URLFilterProtectionLevel } from 'Apis/types';
import type { NotificationsQueue } from 'Common/stores/NotificationsQueue';

/**
 * How long the stats of a pushed URL filter state are held before they are
 * shown without waiting for the next push.
 *
 * The platform pushes the state more than once for one change: the first
 * push carries the previous stats (the URL filter extension persists the new
 * metadata only after the bloom filter download) and the next one carries the
 * fresh stats.
 */
export const URL_FILTER_INFO_FALLBACK_TIMEOUT_MS = 10_000;

/**
 * Checks whether a pushed stats snapshot carries any filtering rules data.
 *
 * The platform omits both fields when the prefilter metadata is absent, for
 * example before the first download.
 *
 * @param info Stats snapshot from the platform.
 */
function hasURLFilterStats(info: URLFilterInfo): boolean {
    return info.has_rules_count || info.has_last_update;
}

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
     * Whether the stats of a pushed state are being held: the next push — or
     * the timeout — shows them.
     */
    private isStatsHeld = false;

    /**
     * Stats of the held pushed state.
     */
    private pendingStats: URLFilterInfo | null = null;

    /**
     * Timer that shows the held stats when no further push arrives.
     */
    private statsHoldTimer: ReturnType<typeof setTimeout> | null = null;

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
     * URL filter info for system-wide protection settings.
     * null for loading
     */
    public urlFilterInfo: null | URLFilterInfo = null;

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
     * Holds the stats of a pushed state: they are shown only when the next
     * push arrives or the timeout passes, never on their own. The first push
     * carries the previous stats (the URL filter extension persists the new
     * metadata only after the bloom filter download), so showing it would end
     * the loader with a stale count.
     *
     * @param info Pushed stats.
     */
    private holdStats(info: URLFilterInfo) {
        this.isStatsHeld = true;
        this.pendingStats = hasURLFilterStats(info) ? info : null;
        this.cancelStatsHoldTimeout();
        this.statsHoldTimer = setTimeout(() => {
            this.statsHoldTimer = null;
            if (!this.isStatsHeld) {
                return;
            }
            // Nothing else arrived: show the held stats.
            this.showStats(this.pendingStats ?? this.urlFilterState.info);
        }, URL_FILTER_INFO_FALLBACK_TIMEOUT_MS);
    }

    /**
     * Shows the given stats and drops any held ones.
     *
     * @param info Stats to display.
     */
    private showStats(info: URLFilterInfo) {
        this.isStatsHeld = false;
        this.pendingStats = null;
        this.cancelStatsHoldTimeout();
        this.setURLFilterInfo(info);
    }

    /**
     * Cancels the pending hold timeout, if any.
     */
    private cancelStatsHoldTimeout() {
        if (this.statsHoldTimer === null) {
            return;
        }
        clearTimeout(this.statsHoldTimer);
        this.statsHoldTimer = null;
    }

    /**
     * URL filter state setter
     */
    public setURLFilterState(data: URLFilterState) {
        this.urlFilterState = data;
    }

    /**
     * Setter for URL filter info.
     * @param data URL filter info to set.
     */
    public setURLFilterInfo(data: typeof this.urlFilterInfo) {
        this.urlFilterInfo = data;
    }

    /**
     * Applies a URL filter state pushed by the platform.
     *
     * The platform pushes the state more than once for one change: the first
     * push carries the previous stats (the URL filter extension persists the
     * new metadata only after the bloom filter download) and the next one
     * carries the fresh stats. The stats of the first push are therefore only
     * held, and the display is updated by the next push — or by the timeout,
     * when it never comes. A single push never ends the loader with a stale
     * count, and the number of pushes does not matter.
     *
     * @param data URL filter state from the platform.
     */
    public applyPushedURLFilterState(data: URLFilterState) {
        this.setURLFilterState(data);

        if (!this.isStatsHeld) {
            // First pushed state: hold its stats until the next push.
            this.holdStats(data.info);
            return;
        }

        // Next pushed state: show its stats — the held ones when it carries none.
        const resolved = hasURLFilterStats(data.info) ? data.info : this.pendingStats;
        this.showStats(resolved ?? data.info);
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
        this.showStats(resp.info);
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
            await this.getURLFilterState();
        }
    }

    /**
     * Update level of protection for SystemWideProtection setting
     */
    public async updateSystemWideProtectionLevel(protectionLevel: URLFilterProtectionLevel) {
        // Re-selecting the active level must not dispatch: it would restart the filter.
        if (protectionLevel === this.urlFilterState.protectionLevel) {
            return;
        }
        const newValue = this.urlFilterState.clone();
        const prevValue = this.urlFilterState.clone();
        // The loader covers the window until the pushed stats are resolved.
        this.setURLFilterInfo(null);
        newValue.protectionLevel = protectionLevel;
        this.setURLFilterState(newValue);
        const resp = await window.API.Execute(new RequestUpdateURLFilterProtectionLevelRequest({ protectionLevel }));
        if (resp.hasError) {
            this.notifyURLFilterCallFailed(true);
            this.setURLFilterState(prevValue);
            this.showStats(prevValue.info);
            await this.getURLFilterState();
        }
    }

    /**
     * Resets URL filter prefilter cache.
     */
    public async resetURLFilterCache() {
        const resp = await window.API.Execute(new ResetURLFilterCacheRequest());
        if (resp.hasError) {
            await this.getURLFilterState();
            this.notifyURLFilterCallFailed();
        }
    }

    /**
     * Removes URL filter configuration.
     */
    public async removeURLFilter() {
        const resp = await window.API.Execute(new RemoveURLFilterRequest());
        if (resp.hasError) {
            await this.getURLFilterState();
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
