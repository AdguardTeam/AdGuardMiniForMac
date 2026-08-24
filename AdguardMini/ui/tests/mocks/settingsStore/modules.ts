// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Node-test stub for the `SettingsStore/modules` barrel. The real barrel
 * (`modules/settings/store/modules/index.ts`) re-exports the full settings
 * store module chain, which is not Node-loadable in the test runner. The
 * callback `*Internal` services import the notification enums + `RouteName`
 * from this barrel; re-exporting the notification enums from the real
 * `Common/stores/NotificationsQueue` (compiled into the test build) keeps
 * the enum values identical to production.
 */

export {
    NotificationContext,
    NotificationsQueueType,
    NotificationsQueueIconType,
} from 'Common/stores/NotificationsQueue';

/**
 * Minimal route enum covering the members the callback internals reference
 * (`FiltersCallbackServiceInternal.OnCustomFiltersSubscribe`).
 */
export enum RouteName {
    filters = 'filters',
}
