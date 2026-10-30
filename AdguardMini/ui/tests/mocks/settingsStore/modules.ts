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
 * Minimal route enum covering the members the compiled components reference
 * (`FiltersCallbackServiceInternal.OnCustomFiltersSubscribe`, the context
 * menu's report-problem action).
 */
export enum RouteName {
    filters = 'filters',
    contact_support = 'contact_support',
}

/**
 * Minimal telemetry event enum covering the events the compiled components
 * reference (the context menu's flag click).
 */
export enum SettingsEvent {
    FlagClick = 'FlagClick',
}
