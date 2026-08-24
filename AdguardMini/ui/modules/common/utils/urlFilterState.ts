// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Minimal notification queue surface needed for deduplicated URL-filter errors.
 */
export interface ActiveNotificationQueue<TNotification> {
    get(id: string): unknown;
    notify(notification: TNotification): string;
}

/**
 * Returns the active notification id if a matching toast is still open,
 * otherwise shows a new notification and returns its id.
 *
 * @param activeNotificationId Previously shown notification id, if any.
 * @param queue Notification queue used for deduplication.
 * @param notification Notification payload to enqueue when needed.
 * @returns Active notification id after deduplication.
 */
export function notifySingleActive<TNotification>(
    activeNotificationId: string | null,
    queue: ActiveNotificationQueue<TNotification>,
    notification: TNotification,
): string {
    if (activeNotificationId && queue.get(activeNotificationId)) {
        return activeNotificationId;
    }

    return queue.notify(notification);
}
