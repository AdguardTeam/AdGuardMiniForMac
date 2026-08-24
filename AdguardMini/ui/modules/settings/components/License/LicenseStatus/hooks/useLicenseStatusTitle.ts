// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { LicenseType } from 'Apis/types';
import { useSettingsStore } from 'SettingsLib/hooks';

/**
 * Gets license status title. Used inside LicenseStatus component
 */
export function useLicenseStatusTitle() {
    const { account } = useSettingsStore();

    const {
        isAppStoreSubscription,
        isTrial,
        isLicenseBlockedAppId,
        isFreeware,
        license,
    } = account;

    if (!account.hasLicense) {
        return translate('license.license.free.version');
    }

    if (isAppStoreSubscription && !license.license?.applicationKeyOwner) {
        return translate('license.license.app.store');
    }

    if (isTrial) {
        return translate('license.license.free.trial');
    }

    switch (license.license?.type) {
        case LicenseType.beta:
            return translate('license.license.beta');
        case LicenseType.bonus:
            return translate('license.license.bonus');
        case LicenseType.family:
            return translate('license.license.family');
        case LicenseType.personal:
            return translate('license.license.personal');
        case LicenseType.standard:
            return translate('license.license.standard');
        case LicenseType.premium:
            return translate('license.license.premium');
    }

    if (isFreeware || isLicenseBlockedAppId) {
        return translate('license.license.free.version');
    }

    return translate('license.license.free.version');
};
