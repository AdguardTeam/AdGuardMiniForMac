// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { DATE_FORMAT, useDateFormat, useSettingsStore } from 'SettingsLib/hooks';
import { Text } from 'UILib';

import { useLicenseStatusDescriptionFields } from './hooks';
import s from './LicenseStatus.module.pcss';

/**
 * Description component for LicenseStatus component
 */
function LicenseStatusDescriptionComponent() {
    const {
        account,
    } = useSettingsStore();
    const format = useDateFormat();
    const fieldsToShow = useLicenseStatusDescriptionFields();

    if (!fieldsToShow || !account.hasLicense || !account.license.license) {
        return null;
    }

    const {
        license: {
            license: {
                validUntil,
                renewalDate,
                currentDevices,
                totalDevices,
                applicationKeyOwner,
            },
        },
    } = account;

    const {
        showDevices,
        showExpired,
        showBlocked,
        showLifetime,
        showNextPayment,
        showValidUntil,
        showFreeVersion,
    } = fieldsToShow;

    const validUntilDate = format((validUntil || 0) * 1000, DATE_FORMAT.day_month_year);
    const renewalDateString = format((renewalDate || 0) * 1000, DATE_FORMAT.day_month_year);
    return (
        <div className={s.LicenseStatusDesc_container}>
            {showLifetime && (
                <Text type="t2">{translate('license.license.lifetime')}</Text>
            )}
            {showValidUntil && validUntilDate && (
                <Text type="t2">{translate('license.license.valid.until', { date: validUntilDate })}</Text>
            )}
            {showNextPayment && renewalDateString && (
                <Text type="t2">{translate('license.license.next.payment', { date: renewalDateString })}</Text>
            )}
            {showDevices && (
                <Text type="t2">
                    {translate('license.license.devices', { current: currentDevices, max: totalDevices })}
                </Text>
            )}
            {applicationKeyOwner && (
                <Text type="t2">
                    {translate('license.license.application.key.owner', {
                        owner: applicationKeyOwner,
                    })}
                </Text>
            )}
            {showExpired && (
                <Text className={s.LicenseStatusDesc_warning} type="t2">
                    {translate('license.license.expired')}
                </Text>
            )}
            {showBlocked && (
                <Text className={s.LicenseStatusDesc_warning} type="t2">
                    {translate('license.license.blocked')}
                </Text>
            )}
            {showFreeVersion && (
                <Text type="t2">
                    {translate('license.license.free.version.desc')}
                </Text>
            )}
        </div>
    );
}

export const LicenseStatusDescription = observer(LicenseStatusDescriptionComponent);
