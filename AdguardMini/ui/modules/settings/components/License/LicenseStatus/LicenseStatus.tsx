// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';
import { NotificationContext, NotificationsQueueType, NotificationsQueueIconType } from 'SettingsStore/modules';
import { Icon } from 'UILib';

import { SettingsItem } from '../../SettingsItem';

import { useLicenseStatusTitle } from './hooks/useLicenseStatusTitle';
import s from './LicenseStatus.module.pcss';
import { LicenseStatusDescription } from './LicenseStatusDescription';

const copiedNotificationUidContainer: { value: string | null } = { value: null };

/**
 * License status for License screen
 */
function LicenseStatusComponent() {
    const {
        account,
        notification,
    } = useSettingsStore();

    const [licenseShow, setLicenseShow] = useState(false);
    const licenseStatusTitle = useLicenseStatusTitle();

    // Getters are unreliable
    const license = account?.license?.license;
    const isAppStoreSubscription = account?.isAppStoreSubscription;
    const licenseKey = license?.licenseKey;

    const showActivationCode = !isAppStoreSubscription && Boolean(licenseKey);

    let code = licenseKey?.getHiddenValue() || '';
    if (!licenseShow) {
        code = `${code.slice(0, 2)}*********${code.slice(-2)}`;
    }

    const handleContainerClick = useCallback(() => {
        if (!licenseKey) {
            return;
        }

        setLicenseShow(true);
        window.SystemClipboard.writeText(licenseKey?.getHiddenValue() || '');
        if (copiedNotificationUidContainer.value) {
            notification.closeNotify(copiedNotificationUidContainer.value);
        }
        copiedNotificationUidContainer.value = notification.notify({
            message: translate('copied'),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.success,
            iconType: NotificationsQueueIconType.done,
            closeable: true,
        });
    }, [licenseKey, notification]);

    return (
        <>
            <SettingsItem
                additionalText={<LicenseStatusDescription />}
                className={s.LicenseStatus_container}
                icon="adguard"
                title={licenseStatusTitle}
                noHover
            />
            {showActivationCode && (
                <SettingsItem
                    className={s.LicenseStatus_container}
                    icon="key"
                    title={translate('license.license.activation.code', { code })}
                    onContainerClick={handleContainerClick}
                >
                    <Icon className={s.LicenseStatus_container_icon} icon="copy" />
                </SettingsItem>
            )}
        </>
    );
}

export const LicenseStatus = observer(LicenseStatusComponent);
