// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSettingsStore } from 'SettingsLib/hooks';

export enum LicenseStatusActionType {
    manageLicense = 'manageLicense',
    getFullVersion = 'getFullVersion',
    renewLicense = 'renewLicense',
}

/**
 * Custom hook that determines which action to show for LicenseStatusAction component
 */
export function useLicenseStatusActionType(): Nullable<LicenseStatusActionType> {
    const { account } = useSettingsStore();

    const {
        isLicenseOrTrialActive,
        isAppStoreSubscription,
        isLicenseBlocked,
        isTrialExpired,
        isLicenseExpired,
        license,
    } = account;

    if (!account.hasLicense) {
        return null;
    }

    if (isAppStoreSubscription ? license.license?.applicationKeyOwner : isLicenseOrTrialActive || isLicenseBlocked) {
        return LicenseStatusActionType.manageLicense;
    }

    if (!isAppStoreSubscription && isTrialExpired) {
        return LicenseStatusActionType.getFullVersion;
    }

    if (!isAppStoreSubscription && isLicenseExpired) {
        return LicenseStatusActionType.renewLicense;
    }

    return null;
}
