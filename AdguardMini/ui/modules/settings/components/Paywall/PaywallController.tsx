// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType } from 'SettingsStore/modules';

import { Paywall } from './Paywall';

/**
 * Controller for paywall layer
 */
function PaywallControllerComponent() {
    const {
        account,
        settings: { isMASReleaseVariant },
        account: { paywallShouldBeShown, isLicenseOrTrialActive },
        notification,
    } = useSettingsStore();

    useEffect(() => {
        if (isMASReleaseVariant) {
            account.getSubscriptionsInfo().then(({ error }) => {
                if (error && paywallShouldBeShown && !isLicenseOrTrialActive) {
                    notification.notify({
                        message: getNotificationSomethingWentWrongText(),
                        notificationContext: NotificationContext.info,
                        type: NotificationsQueueType.warning,
                        iconType: NotificationsQueueIconType.error,
                        closeable: true,
                    });
                }
            });
        }
    }, [notification, account, isMASReleaseVariant, paywallShouldBeShown, isLicenseOrTrialActive]);

    if (paywallShouldBeShown && !isLicenseOrTrialActive) {
        return <Paywall />;
    }

    return null;
}

export const PaywallController = observer(PaywallControllerComponent);
