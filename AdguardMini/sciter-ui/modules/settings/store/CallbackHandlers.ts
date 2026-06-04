// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  CallbackHandlers.ts
//  AdguardMini
//
import debounce from 'lodash/debounce';

import { ImportMode } from 'Apis/types';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, type NotificationsQueue } from 'Common/stores/NotificationsQueue';

import { getNotificationSettingsImportFailedText } from '../lib/utils/translate';

import { RouteName } from './modules/SettingsRouter';

import type { Account } from './modules/Account';
import type { AppInfo } from './modules/AppInfo';
import type { AppSettings } from './modules/AppSettings';
import type { CustomFilters } from './modules/CustomFilters';
import type { ImportExport } from './modules/ImportExport';
import type { SafariProtection } from './modules/SafariProtection';
import type { SettingsRouterStore } from './modules/SettingsRouter';
import type { SettingsTelemetry } from './modules/SettingsTelemetry';
import type { UI } from './modules/UI';
import type { UserRules } from './modules/UserRules';
import type { LicenseOrErrorExtended } from 'Apis/ExtendLicense';
import type {
    EffectiveThemeValue,
    ImportStatus,
    SafariExtensionUpdate,
    EffectiveTheme,
    BoolValue,
    FiltersIndex,
    LicenseOrError,
    StringValue,
    UserRulesCallbackState,
} from 'Apis/types';
import type { AdvancedBlockingStore } from 'Common/stores/AdvancedBlockingStore';
import type { FiltersMetaStore } from 'Common/stores/FiltersMetaStore';
import type { LicenseStore } from 'Common/stores/LicenseStore';
import type { Action } from 'Common/utils/EventAction';
import type { SafariExtensionsStore } from 'Modules/common/stores/SafariExtensionsStore';

/**
 * Cross-store callback orchestration for settings module.
 * Handles callbacks that need to coordinate multiple sub-stores.
 */
export class CallbackHandlers {
    /**
     *
     */
    constructor(
        private readonly licenseStore: LicenseStore,
        private readonly filtersMeta: FiltersMetaStore,
        private readonly advancedBlocking: AdvancedBlockingStore,
        private readonly appSettings: AppSettings,
        private readonly importExport: ImportExport,
        private readonly customFilters: CustomFilters,
        private readonly safariProtection: SafariProtection,
        private readonly userRules: UserRules,
        private readonly appInfo: AppInfo,
        private readonly ui: UI,
        private readonly notification: NotificationsQueue,
        private readonly router: SettingsRouterStore,
        private readonly telemetry: SettingsTelemetry,
        private readonly safariExtensions: SafariExtensionsStore,
        private readonly account: Account,
        private readonly settingsWindowEffectiveThemeChanged: Action<EffectiveTheme>,
    ) {}

    /**
     * Handle license update callback — refreshes related state.
     * Called from AccountCallbackServiceInternal.OnLicenseUpdate.
     */
    public async onLicenseUpdate(param: LicenseOrError): Promise<void> {
        await this.licenseStore.getTrialAvailability();
        this.licenseStore.setLicense(param as unknown as LicenseOrErrorExtended);
        this.appSettings.getSettings();
        this.advancedBlocking.getAdvancedBlocking();
    }

    /**
     * Handle custom filter subscription callback.
     * Navigates to the custom filters page and sets the subscribe URL.
     * Called from FiltersCallbackServiceInternal.OnCustomFiltersSubscribe.
     */
    public onCustomFiltersSubscribe(url: string): void {
        this.router.changePath(RouteName.filters, {
            groupId: this.filtersMeta.filtersIndex.customGroupId,
        });
        this.customFilters.setCustomFiltersSubscribeURL(url);
    }

    /**
     * Handle filters update callback — refreshes filters metadata.
      * Called from FiltersCallbackServiceInternal.OnFiltersUpdate.
     */
    public onFiltersUpdate() {
        this.filtersMeta.getFilters();
    }

    /**
     * Handle filters index update callback — refreshes filters index.
     * Called from FiltersCallbackServiceInternal.OnFiltersIndexUpdate.
     */
    public onFiltersIndexUpdate(param: FiltersIndex) {
        this.filtersMeta.setIndex(param);
    }

    /**
     * Handle Safari extension update callback — refreshes Safari extensions state.
     * Called from SafariCallbackServiceInternal.OnSafariExtensionUpdate.
     */
    public onSafariExtensionUpdate(param: SafariExtensionUpdate) {
        this.safariExtensions.updateSafariExtension(param);
        debounce(() => {
            this.filtersMeta.getFiltersGroupedByExtension();
        }, 100);
    }

    /**
     * Handle login item state change callback — updates login item setting.
     * Called from SettingsCallbackServiceInternal.OnLoginItemStateChange.
     */
    public onLoginItemStateChange(param: BoolValue) {
        this.appSettings.setLoginItem(param.value);
    }

    /**
     * Handle import state change callback — updates import state.
     * Called from ImportCallbackServiceInternal.OnImportStateChange.
     */
    public onImportStateChange(param: ImportStatus) {
        if (param.success) {
            this.filtersMeta.getFilters();
            this.filtersMeta.getEnabledFilters();
            this.advancedBlocking.getAdvancedBlocking();
            this.userRules.getUserRules();
            const { confirmMode } = this.importExport;
            this.notification.notify({
                message: !confirmMode || confirmMode === ImportMode.full
                    ? translate('notification.settings.import')
                    : translate('notification.settings.import.partial'),
                notificationContext: NotificationContext.info,
                type: !confirmMode || confirmMode === ImportMode.full
                    ? NotificationsQueueType.success
                    : NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.done,
                closeable: true,
            });
            this.importExport.onImportSuccess();
        } else if (param.filtersIds.length) {
            this.appSettings.setShouldGiveConsent(param.filtersIds);
        } else {
            this.notification.notify({
                message: getNotificationSettingsImportFailedText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
    }

    /**
     * Handle hardware acceleration change callback — updates hardware acceleration setting.
     * Called from SettingsCallbackServiceInternal.OnHardwareAccelerationChange.
     */
    public onHardwareAccelerationChange(param: BoolValue) {
        this.appSettings.setIncomingHardwareAcceleration(param.value);
    }

    /**
     * Handle application version status resolved callback — updates new version availability.
     * Called from AppInfoCallbackServiceInternal.OnApplicationVersionStatusResolved.
     */
    public onApplicationVersionStatusResolved(param: BoolValue) {
        this.appInfo.setNewVersionAvailable(param.value);
    }

    /**
     * Handle settings window did become main callback — refreshes relevant state and shows problem label if needed.
     * Called from SettingsCallbackServiceInternal.OnWindowDidBecomeMain.
     */
    public onWindowDidBecomeMain() {
        this.safariExtensions.getSafariExtensions();
        this.appSettings.getSettings();
        // On first open status will change from 'notShown' to 'show', needed label will be shown only once on opening
        this.ui.tryShowProblemLabel();
    }

    /**
     *
     */
    public onSettingsPageRequested(param: StringValue) {
        if (param.value === 'paywall') {
            this.account.showPaywall();
        } else {
            this.router.changePath(param.value as RouteName);
        }
    }

    /* Fires when effective theme changed */
    /**
     *
     */
    public onEffectiveThemeChanged(param: EffectiveThemeValue) {
        this.settingsWindowEffectiveThemeChanged.invoke(param.value);
    }

    /* Fires when settings window is opened */
    /**
     *
     */
    public onSettingsWindowOpened() {
        this.ui.setShowSafariExtensionsEnableScreen(true);
    }

    /**
     *
     */
    public onUserFilterChange(param: UserRulesCallbackState) {
        this.userRules.setFromCallback(param);
    }
}
