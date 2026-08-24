// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useRef } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';

/**
 * Hook that shows the paywall if license or trial has expired
 */
export function useCheckExpiredLicenseStatus() {
    const {
        account,
    } = useSettingsStore();

    const { isTrialExpired, isLicenseExpired } = account;

    const paywallHasBeenShownRef = useRef(false);

    useEffect(() => {
        if (paywallHasBeenShownRef.current) {
            return;
        }

        if (isTrialExpired || isLicenseExpired) {
            account.showPaywall();
            paywallHasBeenShownRef.current = true;
        }
    }, [isTrialExpired, isLicenseExpired, account]);
}
