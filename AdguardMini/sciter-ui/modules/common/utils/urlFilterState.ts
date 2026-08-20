// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import {
    URLFilterConfiguration,
    URLFilterState,
} from '../apis/types';

/**
 * Minimal notification queue surface needed for deduplicated URL-filter errors.
 */
export interface ActiveNotificationQueue<TNotification> {
    get(id: string): unknown;
    notify(notification: TNotification): string;
}

/**
 * Builds a new URL-filter state with the provided configuration.
 *
 * All other fields are preserved from the current state.
 *
 * @param currentState Current URL-filter state.
 * @param configuration New configuration to apply.
 * @returns Updated state with preserved metadata.
 */
export function withURLFilterConfiguration(
    currentState: URLFilterState,
    configuration: URLFilterConfiguration,
): URLFilterState {
    return new URLFilterState({
        status: currentState.status,
        configuration,
        info: currentState.info,
        errorMessage: currentState.errorMessage,
        isNew: currentState.isNew,
        isPageNew: currentState.isPageNew,
    });
}

/**
 * Restores the previous configuration while keeping current metadata intact.
 *
 * @param currentState Current URL-filter state, potentially updated externally.
 * @param previousConfiguration Configuration snapshot from before the request.
 * @returns State with restored configuration and preserved live metadata.
 */
export function rollbackURLFilterConfiguration(
    currentState: URLFilterState,
    previousConfiguration: URLFilterConfiguration,
): URLFilterState {
    return withURLFilterConfiguration(currentState, previousConfiguration);
}

/**
 * Restores the card-level "new" flag while preserving all other current fields.
 *
 * @param currentState Current URL-filter state.
 * @param previousIsNew Card-level "new" flag captured before the request.
 * @returns State with restored `isNew` and current values for other fields.
 */
export function rollbackURLFilterCardSeen(
    currentState: URLFilterState,
    previousIsNew: boolean,
): URLFilterState {
    return new URLFilterState({
        status: currentState.status,
        configuration: currentState.configuration,
        info: currentState.info,
        errorMessage: currentState.errorMessage,
        isNew: previousIsNew,
        isPageNew: currentState.isPageNew,
    });
}

/**
 * Restores the page-level "new" flag while preserving all other current fields.
 *
 * @param currentState Current URL-filter state.
 * @param previousIsPageNew Page-level "new" flag captured before the request.
 * @returns State with restored `isPageNew` and current values for other fields.
 */
export function rollbackURLFilterPageSeen(
    currentState: URLFilterState,
    previousIsPageNew: boolean,
): URLFilterState {
    return new URLFilterState({
        status: currentState.status,
        configuration: currentState.configuration,
        info: currentState.info,
        errorMessage: currentState.errorMessage,
        isNew: currentState.isNew,
        isPageNew: previousIsPageNew,
    });
}

/**
 * Restores the previous enabled flag while preserving the current protection level.
 *
 * @param currentConfiguration Current tray URL-filter configuration.
 * @param previousEnabled Enabled flag captured before the request.
 * @returns Configuration with restored enabled flag and current protection level.
 */
export function rollbackTrayURLFilterEnabled(
    currentConfiguration: URLFilterConfiguration,
    previousEnabled: boolean,
): URLFilterConfiguration {
    return URLFilterConfiguration.fromObject({
        enabled: previousEnabled,
        protectionLevel: currentConfiguration.protectionLevel,
    });
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
