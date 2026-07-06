// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  CallbackHandlers.ts
//  AdguardMini
//

import { TrayRoute } from './modules/TrayRouter';
import { TrayPage, type TrayTelemetry } from './modules/TrayTelemetry';

import type { TrayFilters } from './modules';
import type { TrayLicense } from './modules/TrayLicense';
import type { TrayRouterStore } from './modules/TrayRouter';
import type { TraySettings } from './modules/TraySettings';
import type { TrayStatistics } from './modules/TrayStatistics';
import type { LicenseOrErrorExtended } from 'Apis/ExtendLicense';
import type { BoolValue, FiltersStatus, SafariExtensionUpdate, LicenseOrError, EffectiveThemeValue, StringValue, EffectiveTheme } from 'Apis/types';
import type { AdvancedBlockingStore } from 'Common/stores/AdvancedBlockingStore';
import type { NotificationsQueue } from 'Common/stores/NotificationsQueue';
import type { SafariExtensionsStore } from 'Common/stores/SafariExtensionsStore';
import type { Action } from 'Common/utils/EventAction';

/**
 * Cross-this callback orchestration for tray module.
 */
export class CallbackHandlers {
    /**
     *
     */
    constructor(
        private readonly traySettings: TraySettings,
        private readonly trayStatistics: TrayStatistics,
        private readonly advancedBlocking: AdvancedBlockingStore,
        private readonly notification: NotificationsQueue,
        private readonly router: TrayRouterStore,
        private readonly telemetry: TrayTelemetry,
        private readonly trayWindowVisibilityChanged: Action<boolean>,
        private readonly safariExtensions: SafariExtensionsStore,
        private readonly trayFilters: TrayFilters,
        private readonly trayLicense: TrayLicense,
        private readonly trayWindowEffectiveThemeChanged: Action<EffectiveTheme>,
    ) {}

    /**
     * Handle tray window visibility change callback.
     * Orchestrates settings refresh, telemetry, notifications, and navigation.
     * Called from TrayCallbackServiceInternal.OnTrayWindowVisibilityChange.
     */
    public async onWindowVisibilityChanged(isVisible: boolean): Promise<void> {
        if (isVisible) {
            await this.traySettings.getSettings();
            await this.trayStatistics.getStatistics();
            await this.safariExtensions.getSafariExtensions();
            this.telemetry.setPage(TrayPage.TrayMenu);
            this.telemetry.trackPageView();
        } else {
            this.notification.clearAll();
            if (this.router.currentPath !== TrayRoute.home) {
                this.telemetry.setPage('unknown');
                this.router.changePath(TrayRoute.home);
            }
        }
        await this.advancedBlocking.getAdvancedBlocking();
        this.trayWindowVisibilityChanged.invoke(isVisible);
    }

    /**
     *
     */
    public onLoginItemStateChange(param: BoolValue) {
        this.traySettings.setLoginItem(param.value);
    }

    /* Fires when swift resolve if new version is available */
    /**
     *
     */
    public onApplicationVersionStatusResolved(param: BoolValue) {
        this.traySettings.setNewVersionAvailable(param.value);
    }

    /* Fires when swift resolve filters current state */
    /**
     *
     */
    public async onFilterStatusResolved(param: FiltersStatus) {
        this.trayFilters.setFiltersStatus(param);
        // Refresh global settings here to pull the latest lastFiltersUpdateTimestampMs
        // right after Swift reports final filter update status.
        await this.traySettings.getSettings();
    }

    /* Fires when one of extensions updated */
    /**
     *
     */
    public onSafariExtensionUpdate(param: SafariExtensionUpdate) {
        this.safariExtensions.updateSafariExtension(param);
    }

    /* Fires when license state updated */
    /**
     *
     */
    public onLicenseUpdate(param: LicenseOrError) {
        this.trayLicense.licenseStore.setLicense(param as unknown as LicenseOrErrorExtended);
        this.advancedBlocking.getAdvancedBlocking();
    }

    /* Fires when effective theme changed */
    /**
     *
     */
    public onEffectiveThemeChanged(param: EffectiveThemeValue) {
        this.trayWindowEffectiveThemeChanged.invoke(param.value);
    }

    /**
     *
     */
    public onTrayPageRequested(param: StringValue) {
        if (Object.values(TrayRoute).includes(param.value as TrayRoute)) {
            this.router.changePath(param.value as TrayRoute);
        }
    }
}
