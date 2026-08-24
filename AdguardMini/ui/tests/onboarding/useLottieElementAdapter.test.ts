// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { preloadLottieAnimation } from '../../modules/onboarding/lib/hooks/useLottieElementAdapter';
import { __getLottiePreloadCalls, __resetLottiePreloadCalls } from '../mocks/webview-utils-kit';

import type { LottieAnimationData } from '../mocks/webview-utils-kit';

// Animation data mirroring `modules/lottie/ads.json` (frames 0, 33, 101, 157).
const adsAnimationData: LottieAnimationData = {
    markers: [
        { tm: 0, cm: 'animationStartFirstMarker', dr: 0 },
        { tm: 33, cm: 'animationLoopFirstMarker', dr: 0 },
        { tm: 101, cm: 'animationLoopLastMarker', dr: 0 },
        { tm: 157, cm: 'animationEndLastLast', dr: 0 },
    ],
};

beforeEach(() => {
    __resetLottiePreloadCalls();
});

test('preloadLottieAnimation preloads the data into the mounted container element', () => {
    const el = {} as HTMLElement;
    const ref = { current: el };

    preloadLottieAnimation(ref, adsAnimationData);

    const calls = __getLottiePreloadCalls();
    assert.equal(calls.length, 1, 'preload must be invoked once');
    assert.equal(calls[0].el, el, 'preload must target the ref container element');
    assert.equal(calls[0].animationData, adsAnimationData, 'preload must receive the step animation data');
});

test('preloadLottieAnimation is a no-op when the container element is not mounted yet', () => {
    const ref = { current: null };

    preloadLottieAnimation(ref, adsAnimationData);

    assert.equal(__getLottiePreloadCalls().length, 0, 'no preload without a mounted container');
});

test('preloadLottieAnimation is a no-op when no animation data is provided', () => {
    const el = {} as HTMLElement;
    const ref = { current: el };

    preloadLottieAnimation(ref);

    assert.equal(__getLottiePreloadCalls().length, 0, 'no preload without animation data');
});
