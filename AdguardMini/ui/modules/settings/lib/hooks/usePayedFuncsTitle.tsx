// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useId } from 'preact/hooks';

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
 * Apple Mail copy: "Apple Mail" wording for the Mail Tracking Protection promo,
 * in place of the trial and license ones;
 *
 * @param trackTelemetryEvent - The telemetry event to track when the paywall is shown
 * @param textClassName - Optional class name for the text element
 * @param appleMailText - Replaces the trial and license copy with the Apple Mail one
 */
export function usePayedFuncsTitle(
    trackTelemetryEvent?: SettingsEvent,
    textClassName?: string,
    appleMailText?: boolean,
) {
    const { account, settings, telemetry } = useSettingsStore();

    // The action sits inside "Available in the full version. <btn>", so on its
    // own it announces just "Try for free" with no hint of what for.
    const sentenceId = useId();
    const { isLicenseOrTrialActive, trialAvailableDays, appStoreSubscriptions } = account;
    const { isMASReleaseVariant } = settings;
    // 0 is the "no trial" value; the field is null until the platform answers.
    const trialDays = trialAvailableDays ?? 0;

    const renderShowPaywallBtn = (text: string) => (
        <Button
            ariaDescribedby={sentenceId}
            className={s.PayedFuncsTitle_button}
            type="text"
            onClick={(e) => {
                e?.stopPropagation();
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

        if (appleMailText) {
            return translate('advanced.blocking.extra.apple.mail', params);
        }

        if (!(isMASReleaseVariant && appStoreSubscriptions?.result?.promoInfo) && trialDays > 0) {
            return translate('advanced.blocking.extra.try', params);
        }

        if (isMASReleaseVariant) {
            return translate('advanced.blocking.extra.subscribe', params);
        }

        return translate('advanced.blocking.extra.pay', params);
    };

    return !isLicenseOrTrialActive ? (
        <Text className={cx(theme.color.orange, textClassName)} id={sentenceId} type="t2">
            {renderDescription()}
        </Text>
    ) : undefined;
};
