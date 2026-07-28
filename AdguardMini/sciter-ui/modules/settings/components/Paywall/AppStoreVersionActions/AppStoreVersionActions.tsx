// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'preact/hooks';

import { AppStoreSubscription, AppStoreSubscriptionsError } from 'Apis/types';
import { provideTrialDaysParam } from 'Common/utils/translate';
import { useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueType, NotificationsQueueIconType, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Button, Loader, Text } from 'UILib';

import s from '../Paywall.module.pcss';

import { SubscriptionPrices } from './SubscriptionPrices';

/**
 * Actions for paywall component if the current app channel is the App Store channel
 */
function AppStoreVersionActionsComponent() {
    const { account, notification, telemetry } = useSettingsStore();

    const { appStoreSubscriptions, subscriptionPricesAvailable, trialAvailableDays } = account;

    const [currentSelectedPlan, setCurrentSelectedPlan] = useState<AppStoreSubscription>(AppStoreSubscription.annual);
    const [errorAppears, setErrorAppears] = useState(false);

    useEffect(() => {
        if (appStoreSubscriptions?.error
            && appStoreSubscriptions?.error !== AppStoreSubscriptionsError.products_banned) {
            setErrorAppears(true);
            notification.notify({
                message: getNotificationSomethingWentWrongText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
    }, [appStoreSubscriptions, notification]);

    const renderSubscriptionPrices = () => {
        if (!appStoreSubscriptions) {
            return (
                <div className={s.Paywall_actions_loader}>
                    <Loader className={s.Paywall_actions_loader_icon} />
                </div>
            );
        }

        if (appStoreSubscriptions?.result) {
            return (
                <SubscriptionPrices
                    appStoreSubscriptions={appStoreSubscriptions.result}
                    currentSelectedPlan={currentSelectedPlan}
                    setCurrentSelectedPlan={setCurrentSelectedPlan}
                />
            );
        }

        return null;
    };

    let sendTelemetryOnClick = () => {
        telemetry.layersRelay.trackEvent(SettingsEvent.SubscribeSellingScreenClick);
    };
    let buttonTitle = translate('settings.paywall.subscribe');

    if (trialAvailableDays > 0) {
        buttonTitle = translate.plural('settings.paywall.try.for.free', trialAvailableDays, provideTrialDaysParam(trialAvailableDays));
        sendTelemetryOnClick = () => {
            telemetry.layersRelay.trackEvent(SettingsEvent.Try14SellingScreenClick);
        };
    } else if (appStoreSubscriptions?.error === AppStoreSubscriptionsError.products_banned) {
        buttonTitle = translate('settings.paywall.get.full.version');
        // TODO: What is this case?
        sendTelemetryOnClick = () => {
            telemetry.layersRelay.trackEvent(SettingsEvent.GetFullVersionClick);
        };
    }

    return (
        <div className={s.Paywall_actions_container}>
            {renderSubscriptionPrices()}
            {!errorAppears && (
                <Button
                    className={cx(
                        subscriptionPricesAvailable && theme.button.greenSubmit,
                        s.Paywall_actions_button,
                        s.Paywall_actions_submit,
                    )}
                    disabled={!subscriptionPricesAvailable}
                    type={subscriptionPricesAvailable ? 'submit' : 'outlined'}
                    onClick={() => {
                        if (!subscriptionPricesAvailable) {
                            return;
                        }

                        sendTelemetryOnClick();

                        if (appStoreSubscriptions?.result) {
                            account.requestAppStoreSubscription(currentSelectedPlan);
                        }
                        if (appStoreSubscriptions?.error === AppStoreSubscriptionsError.products_banned) {
                            account.requestWebSubscription();
                        }
                        // TODO: in case of other AppStoreSubscriptionsError handle with notification or any other way
                    }}
                >
                    <Text lineHeight="none" type="t1">
                        {buttonTitle}
                    </Text>
                    {trialAvailableDays > 0 && appStoreSubscriptions?.result && (
                        <Text lineHeight="none" type="t3">
                            {currentSelectedPlan === AppStoreSubscription.annual
                                ? translate('settings.paywall.trial.then.yearly', {
                                    currencyAndPrice: appStoreSubscriptions.result.annual?.introOfferDisplayPrice
                                        || appStoreSubscriptions.result.annual?.displayPrice,
                                })
                                : translate('settings.paywall.trial.then.monthly', {
                                    currencyAndPrice: appStoreSubscriptions.result.monthly?.introOfferDisplayPrice
                                        || appStoreSubscriptions.result.monthly?.displayPrice,
                                })}
                        </Text>
                    )}
                </Button>
            )}
        </div>
    );
}

export const AppStoreVersionActions = observer(AppStoreVersionActionsComponent);
