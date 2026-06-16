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
