// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback } from 'preact/hooks';

import { SettingsEvent } from 'SettingsStore/modules';

import { useNotificationSomethingWentWrongText } from './useNotificationSomethingWentWrongText';
import { useSettingsStore } from './useSettingsStore';

/**
 * Parameters of the Apple Mail tracking protection toggle hook.
 */
type UseMailProtectionToggleParams = {
    /**
     * Called on the first enable attempt, to show the Apple Mail extension
     * onboarding dialog.
     */
    onShowOnboarding(): void;
};

/**
 * Shared toggle logic of the Apple Mail tracking protection switches.
 *
 * The feature is toggled both on the Advanced blocking page and on its own
 * page, so both surfaces share the paywall, telemetry, onboarding and
 * filter-state handling.
 *
 * @param params Hook parameters.
 */
export function useMailProtectionToggle({ onShowOnboarding }: UseMailProtectionToggleParams) {
    const {
        account, advancedBlocking, safariProtection, telemetry,
    } = useSettingsStore();
    const notifyError = useNotificationSomethingWentWrongText();

    const { mailProtection, mailOnboardingShown } = advancedBlocking;
    const { blockEmailTrackers } = safariProtection;
    const { isLicenseOrTrialActive } = account;

    const isFree = !isLicenseOrTrialActive;
    // On, but the filter it relies on is off: the protection is not applied yet.
    const isInactive = isLicenseOrTrialActive && mailProtection && !blockEmailTrackers;

    const onUpdate = (value: boolean) => {
        if (isFree) {
            telemetry.trackEvent(SettingsEvent.MailProtectionPaywallClick);
            account.showPaywall();
            return;
        }

        telemetry.trackEvent(value
            ? SettingsEvent.MailProtectionToggleOnClick
            : SettingsEvent.MailProtectionToggleOffClick);
        advancedBlocking.updateMailProtection(value);

        if (value && mailOnboardingShown === false) {
            advancedBlocking.updateMailOnboardingShown(true);
            onShowOnboarding();
        }
    };

    const onEnableFilter = useCallback(async () => {
        telemetry.trackEvent(SettingsEvent.MailProtectionEnableFilterClick);
        const error = await safariProtection.updateBlockEmailTrackers(true);
        if (error) {
            notifyError();
        }
    }, [notifyError, safariProtection, telemetry]);

    return {
        isFree, isInactive, mailProtection, onUpdate, onEnableFilter,
    };
}
