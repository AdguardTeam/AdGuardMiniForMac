// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* Implementation of the generated interface; the generator never overwrites this file. */
import debounce from 'lodash/debounce';

import { getNotificationSettingsImportFailedText } from 'SettingsLib/utils/translate';
import { store } from 'SettingsStore';
import { NotificationContext, NotificationsQueueType, NotificationsQueueIconType } from 'SettingsStore/modules';

import { EmptyValue, ImportMode } from '../types';

import type { ISettingsCallbackServiceInternal } from '../callbacks/SettingsCallbackService';
import type { SafariExtensionUpdate, BoolValue, ImportStatus, StringValue, EffectiveThemeValue, URLFilterState, ApplicationVersionStatus } from '../types';
import type { RouteName } from 'SettingsStore/modules';

const debouncedGroupedFilters = debounce(() => {
    store.filters.getFiltersGroupedByExtension();
}, 100);

/* Service handles settings lists  */
export class SettingsCallbackServiceInternal implements ISettingsCallbackServiceInternal {
    public async OnSafariExtensionUpdate(param: SafariExtensionUpdate): Promise<EmptyValue> {
        store.settings.updateSafariExtension(param);
        debouncedGroupedFilters();
        return new EmptyValue();
    }

    public async OnLoginItemStateChange(param: BoolValue): Promise<EmptyValue> {
        store.settings.setLoginItem(param.value);
        return new EmptyValue();
    }

    public async OnImportStateChange(param: ImportStatus): Promise<EmptyValue> {
        if (param.success) {
            store.filters.getFilters();
            store.filters.getEnabledFilters();
            store.advancedBlocking.getAdvancedBlocking();
            store.userRules.getUserRules();
            const { confirmMode } = store.settings;
            store.notification.notify({
                message: !confirmMode || confirmMode === ImportMode.full ? translate('notification.settings.import') : translate('notification.settings.import.partial'),
                notificationContext: NotificationContext.info,
                type: !confirmMode || confirmMode === ImportMode.full
                    ? NotificationsQueueType.success
                    : NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.done,
                closeable: true,
            });
            store.settings.onImportSuccess();
        } else if (param.filtersIds.length) {
            store.settings.setShouldGiveConsent(param.filtersIds);
        } else {
            store.notification.notify({
                message: getNotificationSettingsImportFailedText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
        return new EmptyValue();
    }

    public async OnHardwareAccelerationChange(param: BoolValue): Promise<EmptyValue> {
        store.settings.setIncomingHardwareAcceleration(param.value);
        return new EmptyValue();
    }

    public async OnApplicationVersionStatusResolved(param: ApplicationVersionStatus): Promise<EmptyValue> {
        store.appInfo.setNewVersionAvailable(param.available);
        store.appInfo.setAvailableVersion(param.version);
        return new EmptyValue();
    }

    public async OnWindowDidBecomeMain(_param: EmptyValue) {
        store.settings.getSafariExtensions();
        store.settings.getSettings();
        store.userRules.getUserRules();
        return new EmptyValue();
    }

    public async OnSettingsPageRequested(param: StringValue): Promise<EmptyValue> {
        if (param.value === 'paywall') {
            store.account.showPaywall();
        } else {
            store.account.closePaywall();
            store.router.changePath(param.value as RouteName);
        }
        return new EmptyValue();
    }

    /* Fires when effective theme changed */
    public async OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue> {
        store.settings.setEffectiveTheme(param.value);

        return new EmptyValue();
    }

    /* Fires when settings window is opened */
    public async OnSettingsWindowOpened(_param: EmptyValue): Promise<EmptyValue> {
        store.ui.setShowSafariExtensionsEnableScreen(true);
        return new EmptyValue();
    }

    /* Fires when URL filter state changed */
    public async OnURLFilterStateChanged(param: URLFilterState): Promise<EmptyValue> {
        // The resolved experimental flag depends on the install state.
        const wasInstalled = store.advancedBlocking.urlFilterState.isInstalled;
        // The store reports a failure itself, deduplicated per error state.
        store.advancedBlocking.applyPushedURLFilterState(param);
        if (wasInstalled !== param.isInstalled) {
            store.settings.getSettings();
        }
        return new EmptyValue();
    }

    /* Fires when the main protection switch changes */
    public async OnProtectionStatusChanged(param: BoolValue): Promise<EmptyValue> {
        store.settings.setProtectionEnabled(param.value);
        return new EmptyValue();
    }

    /* Fires when the Apple Mail tracking protection switch changes */
    public async OnMailProtectionChanged(param: BoolValue): Promise<EmptyValue> {
        store.advancedBlocking.setMailProtection(param.value);
        return new EmptyValue();
    }
}
