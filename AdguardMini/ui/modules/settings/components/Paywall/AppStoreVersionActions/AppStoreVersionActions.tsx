// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'preact/hooks';

import { AppStoreSubscription, AppStoreSubscriptionsError } from 'Apis/types';
import { getUILanguageTag } from 'Common/utils/translate';
import { useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueType, NotificationsQueueIconType, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Button, Loader, Text } from 'UILib';

import s from '../Paywall.module.pcss';
import { formatOfferPeriod, getPlanTrial } from '../planOffer';

import { SubscriptionPrices } from './SubscriptionPrices';

/**
 * Actions for paywall component if the current app channel is the App Store channel
 */
function AppStoreVersionActionsComponent() {
    const { account, notification, telemetry } = useSettingsStore();

    const { appStoreSubscriptions, subscriptionPricesAvailable } = account;

    const [currentSelectedPlan, setCurrentSelectedPlan] = useState<AppStoreSubscription>(AppStoreSubscription.annual);
    const [errorAppears, setErrorAppears] = useState(false);

    const subscriptions = appStoreSubscriptions?.result;
    const selectedPlanInfo = currentSelectedPlan === AppStoreSubscription.monthly
        ? subscriptions?.monthly
        : subscriptions?.annual;
    // The promo campaign and a free trial never run together, so the trial belongs to the selected plan only.
    const trial = subscriptions?.promoInfo ? undefined : getPlanTrial(selectedPlanInfo);
    const trialPeriod = trial
        ? formatOfferPeriod(trial.period, trial.periodCount, getUILanguageTag())
        : undefined;

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
    if (trialPeriod) {
        buttonTitle = translate('settings.paywall.try.for.free.period', { period: trialPeriod });
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
                    {trialPeriod && selectedPlanInfo && (
                        <Text lineHeight="none" type="t3">
                            {translate(
                                currentSelectedPlan === AppStoreSubscription.annual
                                    ? 'settings.paywall.trial.then.yearly'
                                    : 'settings.paywall.trial.then.monthly',
                                { currencyAndPrice: selectedPlanInfo.displayPrice },
                            )}
                        </Text>
                    )}
                </Button>
            )}
        </div>
    );
}

export const AppStoreVersionActions = observer(AppStoreVersionActionsComponent);
