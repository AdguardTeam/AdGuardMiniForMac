// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType } from 'SettingsStore/modules';

import { getNotificationSomethingWentWrongText } from '../utils/translate';

import { useSettingsStore } from './useSettingsStore';

/**
 * Hook to get a function that notifies the user about something went wrong
 * @returns {Function} notifySomethingWentWrong - Function to notify the user about something went wrong
 */
export function useNotificationSomethingWentWrongText() {
    const { notification } = useSettingsStore();

    /**
     * Notify the user about something went wrong
     */
    function notifySomethingWentWrong() {
        notification.notify({
            message: getNotificationSomethingWentWrongText(),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.warning,
            iconType: NotificationsQueueIconType.error,
            closeable: true,
        });
    };

    return notifySomethingWentWrong;
};
