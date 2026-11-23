// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { AppStoreSubscription } from 'Apis/types';
import { getUILanguageTag } from 'Common/utils/translate';
import { useSettingsStore } from 'Modules/settings/lib/hooks';
import { SettingsEvent } from 'Modules/settings/store/modules';
import { Button, Text, Icon } from 'UILib';

import { formatOfferPeriodLength, getPlanPaidOffer } from '../planOffer';

import s from './SubscriptionPrices.module.pcss';

import type { AppStoreSubscriptions } from 'Apis/types';

type SubscriptionPricesProps = {
    appStoreSubscriptions: AppStoreSubscriptions | undefined;
    currentSelectedPlan: AppStoreSubscription;
    setCurrentSelectedPlan(plan: AppStoreSubscription): void;
};

/**
 * Subscription prices select for AppStoreVersionActions component
 */
export function SubscriptionPrices({
    appStoreSubscriptions,
    currentSelectedPlan,
    setCurrentSelectedPlan,
}: SubscriptionPricesProps) {
    const { telemetry } = useSettingsStore();
    const { annual, monthly } = appStoreSubscriptions || {};

    const locale = getUILanguageTag();
    const annualOffer = getPlanPaidOffer(annual);
    const monthlyOffer = getPlanPaidOffer(monthly);

    return (
        <>
            <Button
                className={cx(
                    s.SubscriptionPrices_btn,
                    currentSelectedPlan === AppStoreSubscription.annual && s.SubscriptionPrices_btn__active,
                )}
                div={!!annualOffer}
                type="outlined"
                onClick={() => setCurrentSelectedPlan(AppStoreSubscription.annual)}
            >
                <Text className={s.SubscriptionPrices_btn_text} lineHeight="none" type="t1">
                    {annualOffer
                        ? translate('settings.paywall.plan.with.discount.period', {
                            standard: (text: string) => <span className={s.SubscriptionPrices_offer}>{text}</span>,
                            price: annual?.displayPrice,
                            withDiscount: annualOffer.displayPrice,
                            period: formatOfferPeriodLength(annualOffer.period, annualOffer.periodCount, locale),
                        })
                        : translate('settings.paywall.payment.plan.yearly', {
                            currencyAndPrice: annual?.displayPrice,
                        })}
                </Text>
                <Icon className={s.SubscriptionPrices_btn_icon} icon="check" />
            </Button>
            <Button
                className={cx(
                    s.SubscriptionPrices_btn,
                    currentSelectedPlan === AppStoreSubscription.monthly && s.SubscriptionPrices_btn__active,
                )}
                div={!!monthlyOffer}
                type="outlined"
                onClick={() => {
                    setCurrentSelectedPlan(AppStoreSubscription.monthly);
                    telemetry.layersRelay.trackEvent(SettingsEvent.MonthlyClick);
                }}
            >
                <Text className={s.SubscriptionPrices_btn_text} lineHeight="none" type="t1">
                    {monthlyOffer
                        ? translate('settings.paywall.plan.with.discount.month.period', {
                            standard: (text: string) => <span className={s.SubscriptionPrices_offer}>{text}</span>,
                            price: monthly?.displayPrice,
                            withDiscount: monthlyOffer.displayPrice,
                            period: formatOfferPeriodLength(monthlyOffer.period, monthlyOffer.periodCount, locale),
                        })
                        : translate('settings.paywall.payment.plan.monthly', {
                            currencyAndPrice: monthly?.displayPrice,
                        })}
                </Text>
                <Icon className={s.SubscriptionPrices_btn_icon} icon="check" />
            </Button>
        </>
    );
}
