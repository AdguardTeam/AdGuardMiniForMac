// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PromoInfo } from '../../modules/common/apis/types/AppStoreSubscription';
import { visiblePromoOffer } from '../../modules/settings/components/Paywall/promoOffer';

const offer = new PromoInfo({ title: 'Black Friday', subtitle: '50% off the first year' });

// Visibility inputs that show the card; each test turns one condition off.
const visible = {
    offer,
    hasIntroOfferPrice: true,
    isContentOnRight: false,
    isDismissed: false,
};

test('visiblePromoOffer returns the offer when every condition holds', () => {
    assert.equal(visiblePromoOffer(visible), offer);
});

test('visiblePromoOffer hides the card when the backend sent no promo', () => {
    assert.equal(visiblePromoOffer({ ...visible, offer: undefined }), undefined);
});

test('visiblePromoOffer hides the card without an intro offer price', () => {
    assert.equal(visiblePromoOffer({ ...visible, hasIntroOfferPrice: false }), undefined);
});

test('visiblePromoOffer hides the card while the paywall content is on the right', () => {
    assert.equal(visiblePromoOffer({ ...visible, isContentOnRight: true }), undefined);
});

test('visiblePromoOffer hides the card the user closed', () => {
    assert.equal(visiblePromoOffer({ ...visible, isDismissed: true }), undefined);
});
