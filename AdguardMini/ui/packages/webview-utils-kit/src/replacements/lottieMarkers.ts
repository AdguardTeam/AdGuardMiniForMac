// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/** Marker entry in Lottie JSON `markers` array. */
export interface LottieMarker {
    /** Start frame. */
    tm: number;
    /** Marker name. */
    cm: string;
    /** Marker duration. */
    dr: number;
}

/** Minimal view of Lottie animation JSON. */
export interface LottieAnimationData {
    markers?: LottieMarker[];
    [key: string]: unknown;
}

/** Sciter-compatible marker frame table. */
export type MarkerFrameTable = [string, number][];

/** Build marker frame table from Lottie `markers`. */
export function extractMarkerFrames(
    animationData: LottieAnimationData,
): MarkerFrameTable {
    const markers = animationData.markers ?? [];
    // Cheap shape validation: a malformed entry (missing `cm` or a non-finite
    // `tm`) would otherwise flow through as [undefined, NaN] and silently
    // break `playSegments`. Bundled first-party assets always pass.
    return markers
        .filter((m): m is LottieMarker => (
            typeof m?.cm === 'string' && Number.isFinite(m.tm)
        ))
        .map((m) => [m.cm, m.tm]);
}
