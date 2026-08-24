// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { extractMarkerFrames, type LottieAnimationData, type MarkerFrameTable } from './lottieMarkers';

/** `useLottieElement` params. */
export type UseLottieElementParams = {
    elLottieRef: { current: HTMLElement | null };
};

type LottieElementPlayCallback = () => void;

type LottieElementPlaySettings = {
    /** Whether to loop segment. */
    loop: boolean;
    /** Marker indices `[startMarkerIdx, endMarkerIdx]` into the asset's `markers`. */
    marker: [number, number];
    /**
     * Speed multiplier, 1.0 by default. 2.0 plays twice as fast, 0.5 half speed.
     */
    speed?: number;
};

/** Minimal `lottie-web` `AnimationItem` shape used here. */
interface AnimationItemLike {
    playSegments(segments: [number, number], forceFlag?: boolean): void;
    setSpeed(speed: number): void;
    loop: boolean;
    addEventListener(event: 'complete', cb: () => void): void;
    removeEventListener(event: 'complete', cb: () => void): void;
}

/** `lottie-web` `loadAnimation` factory signature. */
export type __LoadAnimationFactory = (opts: {
    container: HTMLElement;
    renderer?: 'svg' | 'canvas' | 'html';
    loop?: boolean;
    autoplay?: boolean;
    animationData: LottieAnimationData;
}) => AnimationItemLike;

// Bootstrap injects real `lottie-web` factory.
let loadAnimationFactory: __LoadAnimationFactory = undefined!;

/** Set `lottie-web` `loadAnimation` factory. */
export const __setLoadAnimationFactory = (factory: __LoadAnimationFactory): void => {
    loadAnimationFactory = factory;
};

// Per-element loaded animation and marker frames.
interface LoadedAnimation {
    animation: AnimationItemLike;
    markerFrames: MarkerFrameTable;
    /** The currently-registered `complete` listener, so a newly registered
     *  one can replace (and remove) its predecessor instead of accumulating. */
    activeCompleteListener: (() => void) | null;
}
const loadedByElement = new WeakMap<HTMLElement, LoadedAnimation>();

/** Build `{ play }` player for element ref. */
export function __makePlayer(
    elRef: { current: HTMLElement | null },
    currentOnNextRef: { current: LottieElementPlayCallback | null },
): {
    play(settings: LottieElementPlaySettings, onNext?: LottieElementPlayCallback): void;
} {
    return {
        play(settings: LottieElementPlaySettings, onNext?: LottieElementPlayCallback): void {
            const el = elRef.current;
            if (!el) {
                return;
            }
            const { loop, marker: [startMarkerIdx, endMarkerIdx], speed = 1 } = settings;

            if (!loadedByElement.has(el)) {
                throw new Error(
                    'useLottieElement: animation not pre-loaded for this element; '
                    + 'call preloadLottie(el, animationData) first.',
                );
            }
            const entry = loadedByElement.get(el)!;
            const { animation, markerFrames } = entry;

            const fromFrame = markerFrames[startMarkerIdx]?.[1] ?? 0;
            const toFrame = markerFrames[endMarkerIdx]?.[1] ?? fromFrame;

            animation.setSpeed(speed);
            animation.loop = loop;
            animation.playSegments([fromFrame, toFrame], true);

            if (onNext) {
                // Replace the previously registered `complete` listener so
                // repeated plays do not accumulate listeners on the animation
                // object for its entire lifetime.
                if (entry.activeCompleteListener) {
                    animation.removeEventListener('complete', entry.activeCompleteListener);
                    entry.activeCompleteListener = null;
                }
                const listener = () => {
                    if (currentOnNextRef.current === onNext) {
                        currentOnNextRef.current = null;
                        onNext();
                    }
                    // Self-remove once fired so even a fired listener cannot leak.
                    animation.removeEventListener('complete', listener);
                    if (entry.activeCompleteListener === listener) {
                        entry.activeCompleteListener = null;
                    }
                };
                entry.activeCompleteListener = listener;
                currentOnNextRef.current = onNext;
                animation.addEventListener('complete', listener);
            }
        },
    };
}

/**
 * Per-ref playback state (`onNext` holder + memoised player), keyed by the
 * ref object. `useRef`-style refs are stable across Preact renders, so keying
 * on the ref object gives the same stability a `useRef`/`useCallback` pair
 * would, without importing `preact/hooks` (which crashes outside a rendering
 * context and would break Node `node:test` suites).
 */
interface PlaybackState {
    currentOnNextRef: { current: LottieElementPlayCallback | null };
    player: ReturnType<typeof __makePlayer>;
}
const playbackByRef = new WeakMap<UseLottieElementParams['elLottieRef'], PlaybackState>();

/** Lottie playback hook. */
export function useLottieElement(
    elLottieRef: UseLottieElementParams['elLottieRef'],
): {
    play(settings: LottieElementPlaySettings, onNext?: LottieElementPlayCallback): void;
} {
    // Stable player identity across renders: the returned `play` is the same
    // function reference every render (it is the player cached in the WeakMap
    // below), so an adapter's `useCallback([play])` memoization (and downstream
    // effects) do not re-run each render. A fresh wrapper closure per render
    // would break that memoization: an effect keyed on `startLottie` would
    // re-fire on every state change, restart the intro segment and replace a
    // pending `finishLottie` `complete` listener, so the step never advances.
    let state = playbackByRef.get(elLottieRef);
    if (!state) {
        const currentOnNextRef: { current: LottieElementPlayCallback | null } = { current: null };
        state = {
            currentOnNextRef,
            player: __makePlayer(elLottieRef, currentOnNextRef),
        };
        playbackByRef.set(elLottieRef, state);
    }
    const player = state.player;

    // `player.play` closes over `elRef`/`currentOnNextRef` and does not use
    // `this`, so handing it out directly keeps a stable identity.
    return { play: player.play };
}

/** Preload Lottie `animationData` into container. */
export function preloadLottie(
    el: HTMLElement,
    animationData: LottieAnimationData,
): void {
    if (loadedByElement.has(el)) {
        return;
    }
    if (!loadAnimationFactory) {
        // A clear error instead of a raw `TypeError`: the factory is installed
        // once per module load by the host bootstrap before the UI mounts.
        throw new Error(
            'useLottieElement: lottie loadAnimation factory not installed; '
            + 'the host bootstrap must call __setLoadAnimationFactory(...) before preloading.',
        );
    }
    const animation = loadAnimationFactory({
        container: el,
        renderer: 'canvas',
        loop: false,
        autoplay: false,
        animationData,
    });
    loadedByElement.set(el, {
        animation,
        markerFrames: extractMarkerFrames(animationData),
        activeCompleteListener: null,
    });
}
