/* This code was generated automatically by proto-parser tool version 1 */
import { debounce } from 'lodash';
import { store } from 'SettingsStore';
import { NotificationContext, NotificationsQueueType, NotificationsQueueIconType, RouteName } from 'SettingsStore/modules'
import { getNotificationSettingsImportFailedText } from 'SettingsLib/utils/translate';

import { ISettingsCallbackServiceInternal } from './SettingsCallbackService';;
import { SafariExtensionUpdate, EmptyValue, BoolValue, ImportStatus, ImportMode, StringValue, EffectiveThemeValue } from '../types'

const debouncedGroupedFilters = debounce(() => {
    store.filters.getFiltersGroupedByExtension();
}, 100)

/**
 * Timestamp (ms) of the last heavy-data recovery run in `OnWindowDidBecomeMain`.
 * That handler fires on every focus, but Swift only skips DOM-mutating callback
 * delivery while the settings window is hidden (occluded). Full re-fetch is
 * therefore only needed after the window was actually hidden — which, in the
 * crash scenario, lasts far longer than a normal focus change. Gating the heavy
 * re-fetches behind a time gap keeps rapid focus switches from each triggering
 * a full data refresh, while a genuine hidden→visible transition (app
 * backgrounded, device slept) reliably recovers. See `AG-56368`.
 */
let lastSettingsDataRecoveryMs = 0;

/** Minimum gap before the heavy recovery re-fetches run again. */
const SETTINGS_RECOVERY_GAP_MS = 60 * 1000;

/* Service handles settings lists  */
export class SettingsCallbackServiceInternal  implements ISettingsCallbackServiceInternal {
async OnSafariExtensionUpdate(param: SafariExtensionUpdate): Promise<EmptyValue> {
        store.settings.updateSafariExtension(param);
        debouncedGroupedFilters();
        return new EmptyValue();
    }

    async OnLoginItemStateChange(param: BoolValue): Promise<EmptyValue> {
        store.settings.setLoginItem(param.value);
        return new EmptyValue();
    }

    async OnImportStateChange(param: ImportStatus): Promise<EmptyValue> {
        if (param.success) {
            store.filters.getFilters();
            store.filters.getEnabledFilters();
            store.advancedBlocking.getAdvancedBlocking();
            store.userRules.getUserRules();
            const { confirmMode } = store.settings;
            store.notification.notify({
                message: !confirmMode || confirmMode === ImportMode.full ? translate('notification.settings.import') : translate('notification.settings.import.partial'),
                notificationContext: NotificationContext.info,
                type: !confirmMode || confirmMode === ImportMode.full ? NotificationsQueueType.success :NotificationsQueueType.warning,
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

    async OnHardwareAccelerationChange(param: BoolValue): Promise<EmptyValue> {
        store.settings.setIncomingHardwareAcceleration(param.value);
        return new EmptyValue();
    }

    async OnApplicationVersionStatusResolved(param: BoolValue): Promise<EmptyValue> {
        store.appInfo.setNewVersionAvailable(param.value);
        return new EmptyValue();
    }

    async OnWindowDidBecomeMain(param: EmptyValue) {
        store.settings.getSafariExtensions();
        store.settings.getSettings();
         // Re-fetch user rules on open. Their change callback is skipped while
        // the settings window is hidden (AG-56368); refresh to avoid stale rules.
        store.userRules.getUserRules();
        // Recover data for the other DOM-mutating callbacks gated while hidden
        // (license, filters, advanced blocking, app/version). Mirrors
        // `SettingsStore.init`. Throttled by `SETTINGS_RECOVERY_GAP_MS`: this
        // handler runs on every focus, but the heavy refresh is only needed
        // after the window was actually hidden (occluded), not on each focus.
        if (Date.now() - lastSettingsDataRecoveryMs > SETTINGS_RECOVERY_GAP_MS) {
            lastSettingsDataRecoveryMs = Date.now();
            store.account.getLicense();
            store.filters.getFilters();
            store.filters.getEnabledFilters();
            store.filters.getFiltersIndex();
            store.filters.getFiltersGroupedByExtension();
            store.advancedBlocking.getAdvancedBlocking();
            store.appInfo.getAppInfo();
            store.appInfo.checkApplicationVersion();
        }
        // On first open status will change from 'notShown' to 'show', needed label will be shown only once on opening
        store.ui.tryShowProblemLabel();
        return new EmptyValue();
    }

    async OnSettingsPageRequested(param: StringValue): Promise<EmptyValue> {
        if (param.value === 'paywall') {
            store.account.showPaywall();
        } else {
            store.account.closePaywall();
            store.router.changePath(param.value as RouteName);
        }
        return new EmptyValue();
    }

    /* Fires when effective theme changed */
    async OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue> {
        store.settingsWindowEffectiveThemeChanged.invoke(param.value);
    
        return new EmptyValue();
    }

    /* Fires when settings window is opened */
    async OnSettingsWindowOpened(param: EmptyValue): Promise<EmptyValue> {
        store.ui.setShowSafariExtensionsEnableScreen(true);
        return new EmptyValue();
    }
}
