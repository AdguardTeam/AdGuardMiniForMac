// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'preact/hooks';

import { Subscription } from 'Apis/types';
import { getTdsLink, TDS_PARAMS } from 'Modules/common/utils/links';
import { useSettingsStore } from 'SettingsLib/hooks';
import { provideContactSupportParam } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, RouteName, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';

import { AlreadyPurchasedFlowModal } from '../ActivationFlow';
import { SettingsTitle } from '../SettingsTitle';

import { LicenseStatusActionType, useLicenseStatusActionType } from './LicenseStatus/hooks';
import { ResetLicenseModal } from './ResetLicenseModal';

import type { ContextMenuProps } from '../ContextMenu';
import type { LicenseRouterParams } from 'SettingsStore/modules';

/**
 * Title component with context actions for License screen
 */
function LicenseTitleComponent() {
    const {
        account,
        notification,
        router,
        telemetry,
    } = useSettingsStore();

    const showAlreadyPurchasedFlow = router.castParams<LicenseRouterParams>()?.alreadyPurchased;

    const failedToRefreshLicenseNotificationUidRef = useRef<Nullable<string>>(null);

    const {
        isFreeware, isLicenseBlocked, isLicenseBlockedAppId, isAppStoreSubscription, license: { license },
    } = account;

    const [showAlreadyPurchasedFlowModal, setShowAlreadyPurchasedFlowModal] = useState(!!showAlreadyPurchasedFlow);
    const [showResetLicenseModal, setShowResetLicenseModal] = useState(false);

    const elements: ContextMenuProps['elements'] = [];

    if (isFreeware || isLicenseBlocked) {
        elements.push({
            action: () => setShowAlreadyPurchasedFlowModal(true),
            text: translate('settings.activation.flow.already.purchased'),
        });
    }

    const actionType = useLicenseStatusActionType();

    const licenseStatusActionHandler = (): void => {
        switch (actionType) {
            case LicenseStatusActionType.manageLicense:
                telemetry.trackEvent(SettingsEvent.ManageSubscriptionClick);
                if (isAppStoreSubscription) {
                    account.requestOpenSubscriptions();
                } else {
                    window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.licenses, RouteName.license));
                }
                break;
            case LicenseStatusActionType.getFullVersion:
                account.requestWebSubscription(Subscription.standalone);
                break;
            case LicenseStatusActionType.renewLicense:
                account.requestRenewLicense(account.license.license?.licenseKey?.getHiddenValue() || '');
                break;
        }
    };

    const getLicenseStatusActionLabel = (): string => {
        switch (actionType!) {
            case LicenseStatusActionType.manageLicense:
                return translate('license.manage.license');
            case LicenseStatusActionType.getFullVersion:
                return translate('license.get.full.version');
            case LicenseStatusActionType.renewLicense:
                return translate('license.renew.license');
        }
    };

    if ((!isFreeware && !isLicenseBlockedAppId) && actionType) {
        elements.push({
            action: licenseStatusActionHandler,
            text: getLicenseStatusActionLabel(),
        });
    }

    if (!isFreeware) {
        elements.push({
            action: async () => {
                if (failedToRefreshLicenseNotificationUidRef.current) {
                    notification.closeNotify(failedToRefreshLicenseNotificationUidRef.current);
                    failedToRefreshLicenseNotificationUidRef.current = null;
                }

                const checkingLicenseNotificationUid = notification.notify({
                    message: translate('settings.activation.flow.checking.license.status'),
                    notificationContext: NotificationContext.info,
                    type: NotificationsQueueType.success,
                    iconType: NotificationsQueueIconType.loading,
                    closeable: false,
                });

                const { hasError } = await account.refreshLicense();

                notification.closeNotify(checkingLicenseNotificationUid);

                if (hasError) {
                    failedToRefreshLicenseNotificationUidRef.current = notification.notify({
                        message: translate('notification.license.refresh.failed', provideContactSupportParam({
                            className: tx.color.linkGreen,
                        })),
                        notificationContext: NotificationContext.info,
                        type: NotificationsQueueType.warning,
                        iconType: NotificationsQueueIconType.error,
                        closeable: true,
                    });
                }
            },
            text: translate('license.refresh.status'),
        });

        if (license?.canReset) {
            elements.push({
                action: () => setShowResetLicenseModal(true),
                text: translate('license.reset.license'),
                className: theme.button.redText,
            });
        }
    }

    return (
        <>
            <SettingsTitle
                elements={elements}
                navigateContactSupport={{ subject: 'other' }}
                title={translate('menu.license')}
                maxTopPadding
            />
            {showAlreadyPurchasedFlowModal && (
                <AlreadyPurchasedFlowModal
                    onClose={() => setShowAlreadyPurchasedFlowModal(false)}
                />
            )}

            {showResetLicenseModal && (
                <ResetLicenseModal
                    onClose={() => setShowResetLicenseModal(false)}
                />
            )}
        </>
    );
}

export const LicenseTitle = observer(LicenseTitleComponent);
