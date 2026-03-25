// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'preact/hooks';

import { useLottieElementAdapter, useOnboardingStore } from 'OnboardingLib/hooks';
import { OnboardingEvents, OnboardingSteps } from 'OnboardingStore/modules';

import { Step } from '../Step';

/**
 * Step "Ads"
 */
function AdsComponent() {
    const { steps, telemetry } = useOnboardingStore();

    const onSkip = () => {
        steps.setSkipTuning(true);
        steps.setCurrentStep(OnboardingSteps.finish);
    };

    const onTune = () => {
        telemetry.trackEvent(OnboardingEvents.TuneTheAppClick);
        steps.setSkipTuning(false);
        steps.setCurrentStep(OnboardingSteps.trackers);
    };

    const elLottieRef = useRef<HTMLLottieElement | null>(null);
    const { startLottie, finishLottie } = useLottieElementAdapter(elLottieRef);
    useEffect(startLottie, [startLottie]);

    return (
        <Step
            description={translate('onboarding.ads.desc')}
            elLottieRef={elLottieRef}
            lottie="ads"
            primaryButton={{ action: () => finishLottie(onTune), label: translate('onboarding.tune') }}
            secondaryButton={{ action: onSkip, label: translate('onboarding.skip') }}
            title={translate('onboarding.ads.title')}
            imageSmall
        />
    );
}

export const Ads = observer(AdsComponent);
