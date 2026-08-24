/*
 * SPDX-FileCopyrightText: AdGuard Software Limited
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { preloadLottie, useLottieElement } from '@adg/webview-utils-kit';
import { useCallback, useEffect, useState } from 'preact/hooks';

import type { LottieAnimationData, UseLottieElementParams } from '@adg/webview-utils-kit';

type UseLottieElementAdapterParams = UseLottieElementParams & {
    /** Lottie JSON data for step animation asset. */
    animationData?: LottieAnimationData;
};

/** Preload Lottie animation into container element, if available. */
export function preloadLottieAnimation(
    elLottieRef: UseLottieElementAdapterParams['elLottieRef'],
    animationData?: LottieAnimationData,
): void {
    const el = elLottieRef.current;
    if (el && animationData) {
        preloadLottie(el, animationData);
    }
}

/** Adapter for `useLottieElement` from webview-utils-kit. */
export function useLottieElementAdapter(
    elLottieRef: UseLottieElementAdapterParams['elLottieRef'],
    animationData?: LottieAnimationData,
) {
    const [done, setDone] = useState(false);

    const { play } = useLottieElement(elLottieRef);

    useEffect(() => {
        preloadLottieAnimation(elLottieRef, animationData);
    }, [elLottieRef, animationData]);

    const startLottie = useCallback(() => {
        play(
            { loop: false, marker: [0, 2] },
            () => play({ loop: true, marker: [1, 2] }),
        );
    }, [play]);

    const finishLottie = useCallback((onLottieDone: () => void) => {
        if (done) {
            return;
        }

        setDone(true);

        play(
            { loop: false, marker: [2, 3] },
            onLottieDone,
        );
    }, [play, done]);

    return { startLottie, finishLottie };
}
