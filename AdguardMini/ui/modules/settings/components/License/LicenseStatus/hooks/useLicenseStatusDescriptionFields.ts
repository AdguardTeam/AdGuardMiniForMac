// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSettingsStore } from 'SettingsLib/hooks';

type UseLicenseStatusDescriptionFieldsReturnType = {
    showExpired?: boolean;
    showBlocked?: boolean;
    showLifetime?: boolean;
    showNextPayment?: boolean;
    showValidUntil?: boolean;
    showDevices?: boolean;
    showFreeVersion?: boolean;
};

/**
 * Custom hook that determines which fields to show for the LicenseStatusDescription component
 */
export const useLicenseStatusDescriptionFields = (): UseLicenseStatusDescriptionFieldsReturnType | undefined => {
    const {
        account,
    } = useSettingsStore();

    const {
        isAppStoreSubscription,
        isTrialExpired,
        isLicenseExpired,
        isTrialExist,
        isLicenseBlockedAppId,
        isLicenseBlocked,
        isFreeware,
        isLicenseExist,
        license,
    } = account;

    if (!account.hasLicense || !license.license) {
        return undefined;
    }

    const {
        validUntil,
        renewalDate,
        totalDevices,
        licenseLifetime,
        currentDevices,
    } = license.license;

    if (isAppStoreSubscription && !license.license?.applicationKeyOwner) {
        return {
            showExpired: isLicenseExpired,
        };
    }

    if (isTrialExist) {
        return {
            showValidUntil: !!validUntil,
            showDevices: !!totalDevices && !!currentDevices,
            showExpired: isTrialExpired || isLicenseExpired,
        };
    }

    if (isLicenseExist && !isLicenseBlocked) {
        return {
            showLifetime: licenseLifetime,
            showNextPayment: !licenseLifetime && !!renewalDate,
            showValidUntil: !licenseLifetime && !renewalDate && !!validUntil,
            showDevices: !!totalDevices && !!currentDevices,
            showExpired: isLicenseExpired,
        };
    }

    if (isLicenseBlocked) {
        return {
            showBlocked: true,
        };
    }

    if (isFreeware || isLicenseBlockedAppId) {
        return {
            showFreeVersion: true,
        };
    }
};
