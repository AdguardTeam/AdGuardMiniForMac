// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Subscription } from 'Apis/types';
import { provideTrialDaysParam } from 'Common/utils/translate';
import { SettingsEvent } from 'Modules/settings/store/modules';
import { useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { Button, Text } from 'UILib';

import { InfoCard } from './InfoCard';
import s from './UnauthorizedUserNotification.module.pcss';

enum NotificationType {
    isAppStoreSubscription = 'isAppStoreSubscription',
    isActivatedByKey = 'isActivatedByKey',
    isStandaloneFreewareWithTrialAvailable = 'isStandaloneFreewareWithTrialAvailable',
    isStandaloneFreewareWithoutTrial = 'isStandaloneFreewareWithoutTrial',
}

const getNotificationType = (
    isAppStoreSubscription: boolean,
    isActivatedByKey: boolean,
    isStandaloneFreewareWithTrialAvailable: boolean,
    isStandaloneFreewareWithoutTrial: boolean,
) => {
    if (isAppStoreSubscription) {
        return NotificationType.isAppStoreSubscription;
    }

    if (isActivatedByKey) {
        return NotificationType.isActivatedByKey;
    }

    if (isStandaloneFreewareWithTrialAvailable) {
        return NotificationType.isStandaloneFreewareWithTrialAvailable;
    }

    if (isStandaloneFreewareWithoutTrial) {
        return NotificationType.isStandaloneFreewareWithoutTrial;
    }
};

const getNotificationTitle = (notificationType: NotificationType) => {
    switch (notificationType) {
        case NotificationType.isAppStoreSubscription:
            return translate('license.extend.your.license.notification.title');
        case NotificationType.isActivatedByKey:
            return translate('license.secure.your.license.notification.title');
        case NotificationType.isStandaloneFreewareWithTrialAvailable:
            return translate('license.get.a.trial.notification.title');
        case NotificationType.isStandaloneFreewareWithoutTrial:
            return translate('license.use.adguard.notification.title');
    }
};

const getNotificationDescription = (notificationType: NotificationType, trialAvailableDays: number) => {
    switch (notificationType) {
        case NotificationType.isAppStoreSubscription:
            return translate('license.extend.your.license.notification.desc');
        case NotificationType.isActivatedByKey:
            return translate('license.secure.your.license.notification.desc');
        case NotificationType.isStandaloneFreewareWithTrialAvailable:
            return translate.plural('license.get.a.trial.notification.desc', trialAvailableDays, provideTrialDaysParam(trialAvailableDays));
        case NotificationType.isStandaloneFreewareWithoutTrial:
            return translate('license.use.adguard.notification.desc');
    }
};

const renderNotificationButton = (
    notificationType: NotificationType, onClick: () => void, trialAvailableDays: number,
) => {
    const getButtonType = () => {
        switch (notificationType) {
            case NotificationType.isAppStoreSubscription:
            case NotificationType.isActivatedByKey:
                return 'submit';
            case NotificationType.isStandaloneFreewareWithTrialAvailable:
            case NotificationType.isStandaloneFreewareWithoutTrial:
                return 'outlined';
        }
    };

    const getButtonLabel = (availableDays: number) => {
        switch (notificationType) {
            case NotificationType.isAppStoreSubscription:
            case NotificationType.isActivatedByKey:
                return translate('license.notification.action.bind.license');
            case NotificationType.isStandaloneFreewareWithTrialAvailable:
                return translate.plural('license.notification.action.try.for.free', availableDays, provideTrialDaysParam(availableDays));
            case NotificationType.isStandaloneFreewareWithoutTrial:
                return translate('license.notification.action.login.or.signup');
        }
    };

    const getButtonClassName = () => {
        switch (notificationType) {
            case NotificationType.isAppStoreSubscription:
            case NotificationType.isActivatedByKey:
                return cx(
                    theme.button.greenSubmit,
                    s.UnauthorizedUserNotification_button__submit,
                );
            case NotificationType.isStandaloneFreewareWithTrialAvailable:
            case NotificationType.isStandaloneFreewareWithoutTrial:
                return s.UnauthorizedUserNotification_button__outlined;
        }
    };

    return (
        <Button
            className={getButtonClassName()}
            type={getButtonType()}
            onClick={onClick}
        >
            <Text lineHeight="none" type="t1">
                {getButtonLabel(trialAvailableDays)}
            </Text>
        </Button>
    );
};

/**
 * Notification for unauthorized user on License screen
 */
function UnauthorizedUserNotificationComponent() {
    const { account, settings, telemetry } = useSettingsStore();

    const {
        isAppStoreSubscription,
        isLicenseExist,
        trialAvailableDays,
    } = account;

    const { isStandaloneReleaseVariant } = settings;

    // `trialAvailableDays` is null until the platform answers; only a resolved 0 means "no trial".
    const trialDays = trialAvailableDays ?? 0;
    const hasTrialAvailable = isStandaloneReleaseVariant && trialDays > 0;
    const hasNoTrialAvailable = isStandaloneReleaseVariant && trialAvailableDays === 0;

    const notificationType = getNotificationType(
        isAppStoreSubscription,
        isLicenseExist,
        hasTrialAvailable,
        hasNoTrialAvailable,
    );

    if (!notificationType) {
        return null;
    }

    const notificationButtonActionHandler = (): void => {
        switch (notificationType) {
            case NotificationType.isActivatedByKey:
            case NotificationType.isAppStoreSubscription:
                account.requestBindLicense();
                telemetry.trackEvent(SettingsEvent.BindLicenseClick);
                break;
            case NotificationType.isStandaloneFreewareWithTrialAvailable:
                account.requestWebSubscription(Subscription.trial);
                break;
            case NotificationType.isStandaloneFreewareWithoutTrial:
                account.requestBindLicense();
                telemetry.trackEvent(SettingsEvent.BindLicenseClick);
                break;
        }
    };

    return (
        <InfoCard
            buttonSlot={renderNotificationButton(
                notificationType,
                notificationButtonActionHandler,
                trialDays,
            )}
            className={s.UnauthorizedUserNotification}
            titleSlot={(
                <Text
                    lineHeight="none"
                    type="h5"
                >
                    {getNotificationTitle(notificationType)}
                </Text>
            )}
            withFooterPadding
        >
            <Text
                className={s.UnauthorizedUserNotification_description}
                lineHeight="none"
                type="t1"
            >
                {getNotificationDescription(notificationType, trialDays)}
            </Text>
        </InfoCard>
    );
}

export const UnauthorizedUserNotification = observer(UnauthorizedUserNotificationComponent);
