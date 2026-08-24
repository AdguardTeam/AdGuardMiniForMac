// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';

import {
    __makePlayer,
    preloadLottie,
    useLottieElement,
    __setLoadAnimationFactory,
    type __LoadAnimationFactory,
} from '../../../packages/webview-utils-kit/src/replacements/useLottieElement';

// Fake `AnimationItem` that records the calls the impl makes.
interface FakeAnimationItem {
    playSegments: (segments: [number, number], forceFlag?: boolean) => void;
    playSegmentsCalls: [number, number][];
    setSpeed: (speed: number) => void;
    setSpeedCalls: number[];
    loop: boolean;
    __completeCbs: Array<() => void>;
    addEventListener(event: string, cb: () => void): void;
    removeEventListener(event: string, cb: () => void): void;
    __removeCalls: Array<() => void>;
    __fireComplete(): void;
}

function makeFakeAnimationItem(): FakeAnimationItem {
    const cbs: Array<() => void> = [];
    const removeCalls: Array<() => void> = [];
    const segCalls: [number, number][] = [];
    const spdCalls: number[] = [];
    return {
        playSegments(segments: [number, number], _forceFlag?: boolean): void {
            segCalls.push(segments);
        },
        playSegmentsCalls: segCalls,
        setSpeed(speed: number): void { spdCalls.push(speed); },
        setSpeedCalls: spdCalls,
        loop: false,
        __completeCbs: cbs,
        addEventListener(event: string, cb: () => void): void {
            if (event === 'complete') {
                cbs.push(cb);
            }
        },
        removeEventListener(event: string, cb: () => void): void {
            removeCalls.push(cb);
            const idx = cbs.indexOf(cb);
            if (event === 'complete' && idx !== -1) {
                cbs.splice(idx, 1);
            }
        },
        __removeCalls: removeCalls,
        __fireComplete() {
            while (cbs.length > 0) {
                cbs.shift()!();
            }
        },
    };
}

// Animation data mirroring `modules/lottie/ads.json` (frames 0, 33, 101, 157).
const adsAnimationData = {
    markers: [
        { tm: 0,   cm: 'animationStartFirstMarker', dr: 0 },
        { tm: 33,  cm: 'animationLoopFirstMarker',  dr: 0 },
        { tm: 101, cm: 'animationLoopLastMarker',   dr: 0 },
        { tm: 157, cm: 'animationEndLastLast',      dr: 0 },
    ],
};

let currentFake: FakeAnimationItem;
let loadAnimationCallsCount: number;

beforeEach(() => {
    currentFake = makeFakeAnimationItem();
    loadAnimationCallsCount = 0;
    const factory: __LoadAnimationFactory = () => {
        loadAnimationCallsCount++;
        return currentFake as unknown as ReturnType<__LoadAnimationFactory>;
    };
    __setLoadAnimationFactory(factory);
});

afterEach(() => {
    __setLoadAnimationFactory(undefined!);
});

/**
 * Build a ref + preload the ads animation against its container element so
 * the impl's `loadedByElement.has(el)` precondition is satisfied.
 */
function setupRef(): { current: unknown; onNext: { current: (() => void) | null } } {
    const el = ({} as unknown) as HTMLElement;
    const ref = { current: el } as unknown as { current: unknown };
    const onNextRef = { current: null as (() => void) | null };
    preloadLottie(el, adsAnimationData);
    return { ...ref, onNext: onNextRef };
}

test('play() calls AnimationItem.playSegments([fromFrame, toFrame], true) for marker: [0, 2]', () => {
    const ref = setupRef();
    const { play } = __makePlayer(ref as never, ref.onNext);
    play({ loop: false, marker: [0, 2], speed: 1 });

    assert.deepEqual(currentFake.playSegmentsCalls, [[0, 101]]);
});

test('play() sets loop = settings.loop on the AnimationItem', () => {
    const ref = setupRef();
    const { play } = __makePlayer(ref as never, ref.onNext);
    play({ loop: true, marker: [1, 2] });

    assert.equal(currentFake.loop, true);
});

test('play() forwards speed via AnimationItem.setSpeed (default 1.0 when omitted)', () => {
    const ref = setupRef();
    const { play } = __makePlayer(ref as never, ref.onNext);
    play({ loop: false, marker: [0, 1] });             // speed omitted → default 1
    play({ loop: false, marker: [2, 3], speed: 2 });   // explicit speed

    assert.deepEqual(currentFake.setSpeedCalls, [1, 2]);
});

test('preloadLottie is invoked exactly once per element (lazy-load contract)', () => {
    const ref = setupRef();                 // first preload → loadAnimation called once
    const { play } = __makePlayer(ref as never, ref.onNext);

    assert.equal(loadAnimationCallsCount, 1, 'first preload must call the factory');

    // Calling preloadLottie again on the same element must be a no-op.
    preloadLottie(ref.current as unknown as HTMLElement, adsAnimationData);
    assert.equal(loadAnimationCallsCount, 1, 'second preload on the same element must not re-load');

    play({ loop: true, marker: [1, 2] });
});

test('play() throws if the element has not been pre-loaded', () => {
    const el = ({} as unknown) as HTMLElement; // not preloaded
    const ref = { current: el, onNext: { current: null as (() => void) | null } };
    const { play } = __makePlayer(ref as never, ref.onNext);
    assert.throws(
        () => play({ loop: false, marker: [0, 2] }),
        /animation not pre-loaded/i,
    );
});

test('onNext callback fires when the AnimationItem emits "complete"', () => {
    const ref = setupRef();
    const { play } = __makePlayer(ref as never, ref.onNext);
    let called = false;
    play({ loop: false, marker: [2, 3] }, () => { called = true; });

    currentFake.__fireComplete();
    assert.equal(called, true);
});

test('successive play() calls replace (do not stack) the onNext handler', () => {
    const ref = setupRef();
    const { play } = __makePlayer(ref as never, ref.onNext);
    let firstCalled = 0;
    let secondCalled = 0;
    play({ loop: false, marker: [0, 1] }, () => { firstCalled++; });
    play({ loop: false, marker: [1, 2] }, () => { secondCalled++; });

    currentFake.__fireComplete();
    assert.equal(firstCalled, 0, 'first onNext must NOT fire after a replacement');
    assert.equal(secondCalled, 1, 'only the latest onNext may fire');
});

test('useLottieElement returns a referentially stable play across invocations', () => {
    const el = ({} as unknown) as HTMLElement;
    const ref = { current: el } as unknown as { current: HTMLElement | null };
    preloadLottie(el, adsAnimationData);

    const first = useLottieElement(ref);
    const second = useLottieElement(ref);

    assert.equal(
        first.play,
        second.play,
        'play identity must be stable so adapter useCallback([play]) memoization holds',
    );
});
