// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Story identifier of the new default-appearance Tray story that aggregates
 * the three neutral Safari Protection health-check conditions.
 */
export const HEALTH_CHECK_DEFAULT_STORY_ID = 'healthDefault';

/**
 * Telemetry event name for clicks on the new default-appearance story.
 */
export const HEALTH_CHECK_DEFAULT_TELEMETRY_EVENT_NAME = 'story_health_default_click';

/**
 * Neutral sub-conditions consumed by the default-appearance story's eligibility rule.
 */
export type HealthCheckDefaultStoryState = {
    /**
     * True when filters have not been updated for more than seven days.
     */
    lastUpdateMoreSevenDays: boolean;
    /**
     * True when all recommended ad-blocking filters are enabled.
     */
    blockAds: boolean;
    /**
     * True when the social-buttons annoyance filter is enabled.
     */
    blockSocialButtons: boolean;
    /**
     * True when the cookie-notice annoyance filter is enabled.
     */
    blockCookieNotice: boolean;
    /**
     * True when the popups annoyance filter is enabled.
     */
    blockPopups: boolean;
    /**
     * True when the widgets annoyance filter is enabled.
     */
    blockWidgets: boolean;
    /**
     * True when the other-annoyance filter is enabled.
     */
    blockOtherAnnoyance: boolean;
};

/**
 * Returns whether the default-appearance story is eligible given the
 * current neutral sub-conditions.
 * @param state Current neutral sub-conditions.
 * @returns Whether the default story is eligible to appear.
 */
export function isHealthCheckDefaultStoryEligible(state: HealthCheckDefaultStoryState): boolean {
    const hasAllAnnoyanceDisabled = !state.blockSocialButtons
        && !state.blockCookieNotice
        && !state.blockPopups
        && !state.blockWidgets
        && !state.blockOtherAnnoyance;

    return state.lastUpdateMoreSevenDays
        || !state.blockAds
        || hasAllAnnoyanceDisabled;
}
