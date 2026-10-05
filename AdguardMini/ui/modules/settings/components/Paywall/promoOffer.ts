// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { PromoInfo } from 'Apis/types';

/**
 * Inputs deciding whether the promo offer card is shown on the paywall.
 */
type PromoOfferVisibility = {
    /** Promo copy sent by the backend, absent while no promo is running. */
    offer?: PromoInfo;
    /** Whether a subscription carries an intro (discounted) price. */
    hasIntroOfferPrice: boolean;
    /** The paywall content column is laid out on the right. */
    isContentOnRight: boolean;
    /** The user closed the card during this paywall session. */
    isDismissed: boolean;
};

/**
 * Resolves the promo offer to render on the paywall.
 *
 * The card advertises the discounted plan, so it needs promo copy and an intro
 * price to advertise. It is drawn over the illustration on the right, so it
 * stays hidden while the paywall content itself sits there, and it stays
 * dismissed for the rest of the paywall session once the user closes it.
 *
 * @param params - Offer payload and the conditions around showing it
 * @returns The offer to render, or `undefined` when the card must stay hidden
 */
export function visiblePromoOffer({
    offer,
    hasIntroOfferPrice,
    isContentOnRight,
    isDismissed,
}: PromoOfferVisibility): PromoInfo | undefined {
    if (!offer || !hasIntroOfferPrice || isContentOnRight || isDismissed) {
        return undefined;
    }

    return offer;
}
