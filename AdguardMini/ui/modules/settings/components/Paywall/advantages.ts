// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { IconType } from 'UILib';

/**
 * Paywall advantage entry.
 */
export type PaywallAdvantage = {
    /** Localized advantage label. */
    label: string;
    /** Icon shown next to the label. */
    icon: IconType;
};

/**
 * Builds the paywall advantages list.
 *
 * System-wide Protection is shown only while its experimental flag is on;
 * otherwise the list keeps four items with the real-time filter updates
 * advantage.
 *
 * @param experimentalSystemWideProtectionEnabled Whether System-wide Protection is enabled.
 * @returns Advantage entries in display order.
 */
export function getPaywallAdvantages(
    experimentalSystemWideProtectionEnabled: boolean,
): PaywallAdvantage[] {
    return [
        { label: translate('settings.paywall.advantage.1'), icon: 'quality' },
        experimentalSystemWideProtectionEnabled
            ? { label: translate('settings.paywall.advantage.2'), icon: 'apps' }
            : { label: translate('settings.paywall.advantage.3'), icon: 'update' },
        { label: translate('settings.paywall.advantage.5'), icon: 'feedback' },
        { label: translate('settings.paywall.advantage.4'), icon: 'phone' },
    ];
}
