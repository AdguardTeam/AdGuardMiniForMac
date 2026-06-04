// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, NotificationsQueueVariant } from 'Common/stores/NotificationsQueue';

import type { NotificationsQueue } from 'Common/stores/NotificationsQueue';
import type { ComponentChild } from 'preact';

/**
 * Shows a plain success info notification.
 * Replaces the repeated { type: success, iconType: done, closeable: true } pattern.
 */
export const notifySuccess = (
    notification: NotificationsQueue,
    message: ComponentChild,
) => {
    notification.notify({
        message,
        notificationContext: NotificationContext.info,
        type: NotificationsQueueType.success,
        iconType: NotificationsQueueIconType.done,
        closeable: true,
    });
};

/**
 * Shows a success notification with a call-to-action button.
 */
export const notifySuccessCTA = (
    notification: NotificationsQueue,
    message: ComponentChild,
    cta: { onClick(): void; btnLabel: string },
) => {
    notification.notify({
        message,
        notificationContext: NotificationContext.ctaButton,
        type: NotificationsQueueType.success,
        iconType: NotificationsQueueIconType.done,
        closeable: true,
        onClick: cta.onClick,
        btnLabel: cta.btnLabel,
        variant: NotificationsQueueVariant.textOnly,
    });
};

/**
 * Shows a success notification with an undo action.
 */
export const notifySuccessWithUndo = (
    notification: NotificationsQueue,
    message: ComponentChild,
    undoAction: () => void,
) => {
    notification.notify({
        message,
        notificationContext: NotificationContext.info,
        type: NotificationsQueueType.success,
        iconType: NotificationsQueueIconType.done,
        closeable: true,
        undoAction,
    });
};

/**
 * Shows an error/warning notification.
 * Replaces the repeated { type: warning, iconType: error, closeable: true } pattern.
 */
export const notifyError = (
    notification: NotificationsQueue,
    message: ComponentChild,
) => {
    notification.notify({
        message,
        notificationContext: NotificationContext.info,
        type: NotificationsQueueType.warning,
        iconType: NotificationsQueueIconType.error,
        closeable: true,
    });
};
