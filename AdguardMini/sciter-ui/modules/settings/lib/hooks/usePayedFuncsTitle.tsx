// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';
import { Button, Text } from 'UILib';

import s from './PayedFuncsTitle.module.pcss';
import { useSettingsStore } from './useSettingsStore';

import type { SettingsEvent } from 'Modules/settings/store/modules';

/**
 * Hook for payed functions title
 *
 * Trial available: "Try for free" action;
 * No trial available, standalone version: "Get full version" action;
 * No trial available, MAS version: "Subscribe" action;
 *
 * @param trackTelemetryEvent - The telemetry event to track when the paywall is shown
 * @param textClassName - Optional class name for the text element
 */
export function usePayedFuncsTitle(
    trackTelemetryEvent?: SettingsEvent,
    textClassName?: string,
) {
    const { account, settings, telemetry } = useSettingsStore();
    const { isLicenseOrTrialActive, trialAvailableDays } = account;
    const { isMASReleaseVariant } = settings;

    const renderShowPaywallBtn = (text: string) => (
        <Button
            className={s.PayedFuncsTitle_button}
            type="text"
            onClick={() => {
                if (trackTelemetryEvent) {
                    telemetry.trackEvent(trackTelemetryEvent);
                }
                account.showPaywall();
            }}
        >
            <Text className={cx(theme.color.orange, textClassName)} type="t2">
                {text}
            </Text>
        </Button>
    );

    const renderDescription = () => {
        const params = { btn: renderShowPaywallBtn };

        if (trialAvailableDays > 0) {
            return translate('advanced.blocking.extra.try', params);
        }

        if (isMASReleaseVariant) {
            return translate('advanced.blocking.extra.subscribe', params);
        }

        return translate('advanced.blocking.extra.pay', params);
    };

    return !isLicenseOrTrialActive ? (
        <Text className={cx(theme.color.orange, textClassName)} type="t2">
            {renderDescription()}
        </Text>
    ) : undefined;
};
