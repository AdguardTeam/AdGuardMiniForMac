// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useRef } from 'preact/hooks';

import { useOnboardingStore } from './useOnboardingStore';

import type { OnboardingLayer } from 'Modules/onboarding/store/modules/OnboardingTelemetry';

/**
 * Hook that tracks onboarding layer visits, but only once per unique layer.
 * Prevents duplicate tracking when the same layer is visited multiple times.
 *
 * @returns A function that can be called to track the layer visit
 */
export function useGuardedTelemetryLayerTracking() {
    const { telemetry } = useOnboardingStore();
    const guardRef = useRef<Nullable<OnboardingLayer>>(null);

    return function guardedOnboardingLayerTracking(layer: OnboardingLayer) {
        if (guardRef.current === layer) {
            return;
        }

        guardRef.current = layer;
        telemetry.layersRelay.setPage(layer);
        telemetry.layersRelay.trackPageView();
    };
}
