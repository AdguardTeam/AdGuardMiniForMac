// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useEffect, useRef } from 'preact/hooks';

import { OptionalStringValue } from 'Apis/types';
import { getCountableEntityStatuses } from 'Modules/common/utils/utils';
import { useSettingsStore } from 'SettingsLib/hooks';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, NotificationsQueueVariant, SettingsEvent } from 'SettingsStore/modules';

/**
 * Shows a notification if the user has disabled one or more extensions
 */
export function useShowEnableExtensionsNotification() {
    const { router: { currentPath }, notification, settings, telemetry } = useSettingsStore();
    const notificationUid = useRef<string>();

    const {
        allEnabled: allExtensionsEnabled,
        allDisabled: allExtensionsDisabled,
    } = getCountableEntityStatuses(
        settings.safariExtensionsStore.enabledSafariExtensionsCount,
        settings.safariExtensionsStore.safariExtensionsCount,
    );

    const openSafariPref = () => {
        window.API.settingsService.OpenSafariExtensionPreferences(new OptionalStringValue());
        telemetry.trackEvent(SettingsEvent.FixItClick);
    };

    const closeNotification = useCallback(() => {
        if (notificationUid.current) {
            notification.closeNotify(notificationUid.current);
        }
    }, [notification]);

    const showNotification = useCallback(() => {
        notificationUid.current = notification.notify({
            message: allExtensionsDisabled
                ? translate('settings.enable.extensions.all.desc')
                : translate('settings.enable.extensions.desc'),
            notificationContext: NotificationContext.ctaButton,
            btnLabel: translate('settings.enable.extensions.btn'),
            iconType: NotificationsQueueIconType.info,
            onClick: () => {
                openSafariPref();
            },
            type: NotificationsQueueType.warning,
            variant: NotificationsQueueVariant.textOnly,
            timeout: false,
        });
    }, [notification, allExtensionsDisabled, telemetry]);

    /**
     * We should force an update on the snack each time allExtensionsDisabled changes,
     * ensuring the correct message is displayed
     */
    useEffect(() => {
        closeNotification();
    }, [closeNotification, allExtensionsDisabled]);

    /**
     * Main notification logic
     */
    useEffect(() => {
        if (allExtensionsEnabled) {
            closeNotification();
        } else {
            if (notificationUid.current && notification.get(notificationUid.current)) {
                return;
            }

            showNotification();
        }
    }, [
        currentPath, // Show notification on every path
        allExtensionsEnabled,
        showNotification,
        closeNotification,
        notification,
    ]);
}
