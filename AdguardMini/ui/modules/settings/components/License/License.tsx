// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { Layout } from 'UILib';

import { PerksOfTheFullVersion, UnauthorizedUserNotification } from './InfoCard';
import { LicenseStatus } from './LicenseStatus';
import { LicenseTitle } from './LicenseTitle';

/**
 * License page component for settings
 */
function LicenseComponent() {
    const {
        account,
    } = useSettingsStore();

    const {
        isLicenseExist,
        license,
        isLicenseExpired,
        isTrialActive,
    } = account;

    return (
        <Layout type="settingsPage">
            <LicenseTitle />
            <LicenseStatus />

            {(!isLicenseExist
                || isLicenseExpired
                // We do not show perks of full version for App Store trial versions.
                // Apple trial license is packed with full subscription.
                || (isTrialActive && !account.isAppStoreSubscription))
            && <PerksOfTheFullVersion withBottomMargin />}
            {(!license.license?.applicationKeyOwner && !isLicenseExpired) && <UnauthorizedUserNotification />}
            <div className={theme.layout.bottomPadding} />
        </Layout>
    );
}

export const License = observer(LicenseComponent);
