// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useGuardedTelemetryLayerTracking } from 'Modules/onboarding/lib/hooks/useGuardedTelemetryLayerTracking';
import { useOnboardingStore, useTheme } from 'OnboardingLib/hooks';
import { OnboardingLayer, OnboardingSteps } from 'OnboardingStore/modules';

import { Start, Extensions, Ads, Trackers, Annoyances, Finish } from './steps';

/**
 * Main onboarding entry
 */
function OnboardingComponent() {
    const { steps } = useOnboardingStore();
    const tracker = useGuardedTelemetryLayerTracking();

    const { currentStep } = steps;

    useTheme((theme) => {
        document.documentElement.setAttribute('theme', theme);
    });

    switch (currentStep) {
        case OnboardingSteps.start: {
            return <Start trackPage={() => tracker(OnboardingLayer.EulaScreen)} />;
        }
        case OnboardingSteps.extensions: {
            tracker(OnboardingLayer.ExtensionsScreen);
            return <Extensions />;
        }
        case OnboardingSteps.ads: {
            tracker(OnboardingLayer.OnboardingScreen);
            return <Ads />;
        }
        case OnboardingSteps.trackers: {
            tracker(OnboardingLayer.BlockTrackersScreen);
            return <Trackers />;
        }
        case OnboardingSteps.annoyances: {
            tracker(OnboardingLayer.BlockAnnoyancesOnboarding);
            return <Annoyances />;
        }
        case OnboardingSteps.finish: {
            tracker(OnboardingLayer.AllSetScreen);
            return <Finish />;
        }
    }
}

export const Onboarding = observer(OnboardingComponent);
