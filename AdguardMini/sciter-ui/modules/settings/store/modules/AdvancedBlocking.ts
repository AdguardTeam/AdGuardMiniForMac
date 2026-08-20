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
import {
    NotificationContext,
    NotificationsQueueIconType,
    NotificationsQueueType,
} from 'Common/stores/NotificationsQueue';
import { withLast } from 'Common/utils/queue';
import {
    notifySingleActive,
    rollbackURLFilterCardSeen,
    rollbackURLFilterConfiguration,
    rollbackURLFilterPageSeen,
    withURLFilterConfiguration,
} from 'Common/utils/urlFilterState';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';

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
     * Active URL-filter failure notification id used to deduplicate toasts.
     */
    private urlFilterCallFailedNotificationId: string | null = null;

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
     * Shows a generic warning when a System-wide Protection backend call fails.
     */
    private notifyURLFilterCallFailed() {
        this.urlFilterCallFailedNotificationId = notifySingleActive(
            this.urlFilterCallFailedNotificationId,
            this.rootStore.notification,
            {
                message: getNotificationSomethingWentWrongText(),
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
        try {
            const resp = await window.API.Execute(new GetURLFilterStateRequest());
            this.setURLFilterState(resp);
        } catch {
            this.notifyURLFilterCallFailed();
        }
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
        const previousConfiguration = URLFilterConfiguration.fromObject(this.urlFilterState.configuration.toObject());
        const newConfiguration = new URLFilterConfiguration({
            enabled: value.enabled,
            protectionLevel: value.protectionLevel,
        });

        this.setURLFilterState(withURLFilterConfiguration(this.urlFilterState, newConfiguration));

        void window.API.Execute(new UpdateURLFilterConfigurationRequest(newConfiguration))
            .catch(() => {
                this.setURLFilterState(rollbackURLFilterConfiguration(this.urlFilterState, previousConfiguration));
                this.notifyURLFilterCallFailed();
            });
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
        void window.API.Execute(new MarkURLFilterInstallRequestedRequest())
            .catch(() => {
                this.notifyURLFilterCallFailed();
            });
    }

    /**
     * Resets URL filter prefilter cache.
     */
    public resetURLFilterCache() {
        void window.API.Execute(new ResetURLFilterCacheRequest())
            .catch(() => {
                this.notifyURLFilterCallFailed();
            });
    }

    /**
     * Removes URL filter configuration.
     */
    public removeURLFilter() {
        void window.API.Execute(new RemoveURLFilterRequest())
            .catch(() => {
                this.notifyURLFilterCallFailed();
            });
    }

    /**
     * Marks system-wide protection card as seen.
     */
    public markSystemWideProtectionAsSeen() {
        const { isNew, isPageNew: previousIsPageNew } = this.urlFilterState;
        this.setURLFilterState(new URLFilterState({
            status: this.urlFilterState.status,
            configuration: this.urlFilterState.configuration,
            info: this.urlFilterState.info,
            errorMessage: this.urlFilterState.errorMessage,
            isNew: false,
            isPageNew: previousIsPageNew,
        }));

        void window.API.Execute(new MarkURLFilterSeenRequest({
            isNew: false,
            isPageNew: previousIsPageNew,
        })).catch(() => {
            this.setURLFilterState(rollbackURLFilterCardSeen(this.urlFilterState, isNew));
            this.notifyURLFilterCallFailed();
        });
    }

    /**
     * Marks system-wide protection page as seen.
     */
    public markSystemWideProtectionPageAsSeen() {
        const { isNew: previousIsNew, isPageNew } = this.urlFilterState;
        this.setURLFilterState(new URLFilterState({
            status: this.urlFilterState.status,
            configuration: this.urlFilterState.configuration,
            info: this.urlFilterState.info,
            errorMessage: this.urlFilterState.errorMessage,
            isNew: previousIsNew,
            isPageNew: false,
        }));

        void window.API.Execute(new MarkURLFilterSeenRequest({
            isNew: previousIsNew,
            isPageNew: false,
        })).catch(() => {
            this.setURLFilterState(rollbackURLFilterPageSeen(this.urlFilterState, isPageNew));
            this.notifyURLFilterCallFailed();
        });
    }
}
