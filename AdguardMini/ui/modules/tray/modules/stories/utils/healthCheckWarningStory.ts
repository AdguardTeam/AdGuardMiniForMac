// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { SafariExtensionStatus } from 'Apis/types/SafariExtension';

import type { SafariExtension } from 'Apis/types/SafariExtension';

/**
 * Story identifier of the new combined warning Tray story that aggregates
 * Safari Protection health-check warning conditions.
 */
export const HEALTH_CHECK_WARNING_STORY_ID = 'healthWarning';

/**
 * Telemetry event name for clicks on the new combined warning story card.
 */
export const HEALTH_WARNING_TELEMETRY_EVENT_NAME = 'story_health_warning_click';

/**
 * Safari extension statuses that count as "broken" for the purposes of the
 * combined warning story.
 */
const BROKEN_EXTENSION_STATUSES: ReadonlyArray<SafariExtensionStatus> = [
    SafariExtensionStatus.unknown,
    SafariExtensionStatus.converter_error,
    SafariExtensionStatus.safari_error,
];

/**
 * Warning sub-conditions consumed by the combined warning story's eligibility rule.
 */
export type HealthWarningStoryState = {
    /**
     * True when every Safari extension is enabled.
     */
    allExtensionsEnabled: boolean;
    /**
     * True when the login item (background execution) is enabled.
     */
    loginItemEnabled: boolean;
    /**
     * Effective (non-flickering) list of Safari extensions.
     */
    effectiveExtensionsList: SafariExtension[];
};

/**
 * Returns whether the combined warning story is eligible to appear given
 * the current warning sub-conditions.
 *
 * @param state Current warning sub-conditions.
 * @returns Whether the warning story is eligible to appear.
 */
export function isHealthCheckWarningStoryEligible(state: HealthWarningStoryState): boolean {
    const hasExtensionsBroken = state.effectiveExtensionsList.some(
        (extension) => BROKEN_EXTENSION_STATUSES.includes(extension.status),
    );
    const hasRulesLimitExceeded = state.effectiveExtensionsList.some(
        (extension) => extension.status === SafariExtensionStatus.limit_exceeded,
    );

    return !state.allExtensionsEnabled
        || !state.loginItemEnabled
        || hasExtensionsBroken
        || hasRulesLimitExceeded;
}
