import type { RefObject } from 'preact';
export type UseLottieElementParams = {
    elLottieRef: RefObject<HTMLElement | null>;
};
type LottieElementPlayCallback = () => void;
type LottieElementPlaySettings = {
    loop: boolean;
    /** Marker indices `[startMarkerIdx, endMarkerIdx]` into the asset's `markers`. */
    marker: [number, number];
    /**
     * Speed multiplier, 1.0 by default. 2.0 will play animation 2 times faster, 0.5 will play two times slower.
     */
    speed?: number;
};
/** Lottie playback hook for WKWebView (`lottie-web` replacement). */
export declare function useLottieElement(elLottieRef: UseLottieElementParams['elLottieRef']): {
    play: (settings: LottieElementPlaySettings, onNext?: LottieElementPlayCallback) => void;
};
/** Marker entry shape from AdGuard Lottie JSON assets. */
export type LottieMarker = {
    /** Frame number at which the marker starts. */
    tm: number;
    /** Human-readable marker name (e.g., `animationStartFirstMarker`). */
    cm: string;
    /** Marker duration in frames (always 0 in the shipped assets). */
    dr: number;
};
/** Minimal structural view of Lottie animation JSON. */
export type LottieAnimationData = {
    markers?: LottieMarker[];
    [key: string]: unknown;
};
/** Sciter-compatible marker frame table: `[markerName, frame]`. */
export type MarkerFrameTable = [string, number][];
/** Build Sciter-compatible marker frame table from Lottie `markers`. */
export declare function extractMarkerFrames(animationData: LottieAnimationData): MarkerFrameTable;
/** Signature of `lottie-web` `loadAnimation` factory. */
export type __LoadAnimationFactory = (opts: {
    container: HTMLElement;
    renderer?: 'svg' | 'canvas' | 'html';
    loop?: boolean;
    autoplay?: boolean;
    animationData: LottieAnimationData;
}) => unknown;
/** Register `lottie-web` `loadAnimation` factory for `preloadLottie`. */
export declare function __setLoadAnimationFactory(factory: __LoadAnimationFactory): void;
/** Preload Lottie animation data into container DOM node. */
export declare function preloadLottie(el: HTMLElement, animationData: LottieAnimationData): void;
export {};
