// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    AppStoreSubscriptionInfo,
    AppStoreSubscriptionOfferPeriod,
    AppStoreSubscriptionOfferPeriodUnit,
    AppStoreSubscriptionOfferType,
} from '../../modules/common/apis/types/AppStoreSubscription';
import {
    formatOfferPeriod,
    formatOfferPeriodLength,
    getPlanPaidOffer,
    getPlanTrial,
} from '../../modules/settings/components/Paywall/planOffer';

/**
 * Builds plan info carrying the given offer, as the platform sends it.
 */
function planWithOffer(offer: {
    type: AppStoreSubscriptionOfferType;
    displayPrice?: string;
    unit?: AppStoreSubscriptionOfferPeriodUnit;
    value?: number;
    periodCount?: number;
}): AppStoreSubscriptionInfo {
    const plan = new AppStoreSubscriptionInfo({ displayPrice: '1,999.99 TRY' });
    plan.introOfferType = offer.type;
    plan.introOfferPeriodCount = offer.periodCount ?? 0;

    if (offer.displayPrice) {
        plan.introOfferDisplayPrice = offer.displayPrice;
    }
    if (offer.unit !== undefined) {
        plan.introOfferPeriod = new AppStoreSubscriptionOfferPeriod({
            unit: offer.unit,
            value: offer.value ?? 1,
        });
    }

    return plan;
}

test('getPlanTrial reads the trial the selected plan grants', () => {
    const plan = planWithOffer({
        type: AppStoreSubscriptionOfferType.free_trial,
        unit: AppStoreSubscriptionOfferPeriodUnit.week,
    });

    const trial = getPlanTrial(plan);

    assert.equal(trial?.period.unit, AppStoreSubscriptionOfferPeriodUnit.week);
    assert.equal(trial?.periodCount, 1);
});

test('getPlanTrial ignores plans without a free trial', () => {
    const paidOffer = planWithOffer({
        type: AppStoreSubscriptionOfferType.pay_up_front,
        displayPrice: '799.99 TRY',
        unit: AppStoreSubscriptionOfferPeriodUnit.year,
    });
    const noOffer = planWithOffer({ type: AppStoreSubscriptionOfferType.no_offer });

    assert.equal(getPlanTrial(paidOffer), undefined);
    assert.equal(getPlanTrial(noOffer), undefined);
    assert.equal(getPlanTrial(undefined), undefined);
});

test('getPlanPaidOffer returns the price and the period of a paid intro offer', () => {
    const plan = planWithOffer({
        type: AppStoreSubscriptionOfferType.pay_up_front,
        displayPrice: '799.99 TRY',
        unit: AppStoreSubscriptionOfferPeriodUnit.year,
    });

    const offer = getPlanPaidOffer(plan);

    assert.equal(offer?.displayPrice, '799.99 TRY');
    assert.equal(offer?.period.unit, AppStoreSubscriptionOfferPeriodUnit.year);
    assert.equal(offer?.periodCount, 1);
});

test('getPlanPaidOffer keeps the number of periods the offer covers', () => {
    const plan = planWithOffer({
        type: AppStoreSubscriptionOfferType.pay_as_you_go,
        displayPrice: '99.99 TRY',
        unit: AppStoreSubscriptionOfferPeriodUnit.month,
        periodCount: 3,
    });

    assert.equal(getPlanPaidOffer(plan)?.periodCount, 3);
});

test('getPlanPaidOffer ignores free trials and plans without an offer', () => {
    const freeTrial = planWithOffer({
        type: AppStoreSubscriptionOfferType.free_trial,
        unit: AppStoreSubscriptionOfferPeriodUnit.week,
    });
    const noOffer = planWithOffer({ type: AppStoreSubscriptionOfferType.no_offer });

    assert.equal(getPlanPaidOffer(freeTrial), undefined);
    assert.equal(getPlanPaidOffer(noOffer), undefined);
    assert.equal(getPlanPaidOffer(undefined), undefined);
});

test('formatOfferPeriod spells the offer length in the given language', () => {
    const month = new AppStoreSubscriptionOfferPeriod({
        unit: AppStoreSubscriptionOfferPeriodUnit.month,
        value: 1,
    });

    assert.equal(formatOfferPeriod(month, 3, 'en'), '3 months');
    assert.equal(formatOfferPeriod(month, 3, 'ru'), '3 месяца');
});

test('formatOfferPeriodLength supplies a bare unit for a single period', () => {
    const year = new AppStoreSubscriptionOfferPeriod({
        unit: AppStoreSubscriptionOfferPeriodUnit.year,
        value: 1,
    });
    const month = new AppStoreSubscriptionOfferPeriod({
        unit: AppStoreSubscriptionOfferPeriodUnit.month,
        value: 1,
    });

    assert.equal(formatOfferPeriodLength(year, 1, 'en'), 'year');
    assert.equal(formatOfferPeriodLength(month, 3, 'en'), '3 months');
});
