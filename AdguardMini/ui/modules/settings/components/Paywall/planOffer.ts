// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { AppStoreSubscriptionOfferPeriodUnit, AppStoreSubscriptionOfferType } from 'Apis/types';

import type { AppStoreSubscriptionInfo, AppStoreSubscriptionOfferPeriod } from 'Apis/types';

/**
 * Unit names the offer periods are spelled with.
 */
const PERIOD_UNITS: Record<AppStoreSubscriptionOfferPeriodUnit, 'day' | 'week' | 'month' | 'year'> = {
    [AppStoreSubscriptionOfferPeriodUnit.day]: 'day',
    [AppStoreSubscriptionOfferPeriodUnit.week]: 'week',
    [AppStoreSubscriptionOfferPeriodUnit.month]: 'month',
    [AppStoreSubscriptionOfferPeriodUnit.year]: 'year',
};

/**
 * A free trial a plan grants.
 */
export type PlanTrial = {
    /** Length of one trial period */
    period: AppStoreSubscriptionOfferPeriod;
    /** Number of periods the trial covers */
    periodCount: number;
};

/**
 * A discounted intro offer a plan carries.
 */
export type PlanPaidOffer = PlanTrial & {
    /** Price the App Store charges for the offer */
    displayPrice: string;
};

/**
 * Returns the free trial a plan grants, or `undefined` when it grants none.
 *
 * The trial belongs to the plan the user selected: the store can run a trial
 * on one plan and a paid intro offer or no offer at all on the other.
 *
 * @param plan - Subscription info for one plan, absent until the platform answers
 */
export function getPlanTrial(plan?: AppStoreSubscriptionInfo | null): PlanTrial | undefined {
    if (plan?.introOfferType !== AppStoreSubscriptionOfferType.free_trial || !plan.has_intro_offer_period) {
        return undefined;
    }

    return {
        period: plan.introOfferPeriod,
        periodCount: getPeriodCount(plan),
    };
}

/**
 * Returns the discounted intro offer a plan carries, or `undefined` when the
 * plan has none.
 *
 * A free trial has no discounted price of its own, so it must not produce a
 * strikethrough next to the regular price.
 *
 * @param plan - Subscription info for one plan, absent until the platform answers
 */
export function getPlanPaidOffer(plan?: AppStoreSubscriptionInfo | null): PlanPaidOffer | undefined {
    if (!plan || !plan.has_intro_offer_period || !plan.introOfferDisplayPrice) {
        return undefined;
    }

    if (
        plan.introOfferType !== AppStoreSubscriptionOfferType.pay_as_you_go
        && plan.introOfferType !== AppStoreSubscriptionOfferType.pay_up_front
    ) {
        return undefined;
    }

    return {
        displayPrice: plan.introOfferDisplayPrice,
        period: plan.introOfferPeriod,
        periodCount: getPeriodCount(plan),
    };
}

/**
 * Spells how long an offer lasts for copy that counts the periods itself,
 * e.g. `1 week` or `3 months`.
 *
 * @param period - Length of one offer period
 * @param periodCount - Number of periods the offer covers
 * @param locale - BCP 47 tag of the language to spell the length in
 */
export function formatOfferPeriod(
    period: AppStoreSubscriptionOfferPeriod,
    periodCount: number,
    locale: string,
): string {
    return createPeriodFormat(period, locale).format(periodCount);
}

/**
 * Spells how long an offer lasts for copy that already carries the ordinal
 * (`for the first %period%`): a single period supplies the bare unit name
 * (`year`), several periods carry their count (`3 months`).
 *
 * @param period - Length of one offer period
 * @param periodCount - Number of periods the offer covers
 * @param locale - BCP 47 tag of the language to spell the length in
 */
export function formatOfferPeriodLength(
    period: AppStoreSubscriptionOfferPeriod,
    periodCount: number,
    locale: string,
): string {
    const periodFormat = createPeriodFormat(period, locale);
    if (periodCount !== 1) {
        return periodFormat.format(periodCount);
    }

    const unit = periodFormat.formatToParts(periodCount).find(({ type }) => type === 'unit')?.value;

    return unit || periodFormat.format(periodCount);
}

/**
 * The number of periods an offer covers, never less than one.
 *
 * @param plan - Subscription info carrying the offer
 */
function getPeriodCount(plan: AppStoreSubscriptionInfo): number {
    return plan.introOfferPeriodCount || 1;
}

/**
 * Creates the format that spells a period length in the given language.
 *
 * @param period - Length of one offer period
 * @param locale - BCP 47 tag of the language to spell the length in
 */
function createPeriodFormat(period: AppStoreSubscriptionOfferPeriod, locale: string): Intl.NumberFormat {
    return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: PERIOD_UNITS[period.unit],
        unitDisplay: 'long',
    });
}
