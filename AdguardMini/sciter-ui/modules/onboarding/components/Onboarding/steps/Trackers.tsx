// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'preact/hooks';

import { OnboardingEvents } from 'Modules/onboarding/store/modules';
import { useLottieElementAdapter, useOnboardingStore } from 'OnboardingLib/hooks';

import { Step } from '../Step';

/**
 * Step "Trackers"
 */
function TrackersComponent() {
    const { steps, telemetry } = useOnboardingStore();

    const elLottieRef = useRef<HTMLLottieElement | null>(null);
    const { startLottie, finishLottie } = useLottieElementAdapter(elLottieRef);
    useEffect(startLottie, [startLottie]);

    /**
     *
     */
    function handleBlockTrackers() {
        finishLottie(async () => steps.shouldBlockTrackers(true));
        telemetry.layersRelay.trackEvent(OnboardingEvents.BlockTrackersYesClick);
    }

    /**
     *
     */
    async function handleSkipTrackers() {
        await steps.shouldBlockTrackers(false);
    }

    return (
        <Step
            pageContainerTestId="onboarding-trackers-page"
            testIdPrimaryButton="onboarding-trackers-block-button"
            testIdSecondaryButton="onboarding-trackers-dont-block-button"
            description={translate('onboarding.trackers.desc')}
            elLottieRef={elLottieRef}
            lottie="trackers"
            primaryButton={{ action: handleBlockTrackers, label: translate('onboarding.block.btn') }}
            secondaryButton={{ action: handleSkipTrackers, label: translate('onboarding.dont.block.btn') }}
            title={translate('onboarding.trackers.title')}
            imageSmall
        />
    );
}

export const Trackers = observer(TrackersComponent);
