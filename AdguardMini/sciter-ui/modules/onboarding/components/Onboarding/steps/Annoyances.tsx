// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'preact/hooks';

import { ConsentModal } from 'Common/components';
import { OnboardingEvents } from 'Modules/onboarding/store/modules';
import { useLottieElementAdapter, useOnboardingStore } from 'OnboardingLib/hooks';

import { Step } from '../Step';

/**
 * Step "Annoyances"
 */
function AnnoyancesComponent() {
    const { steps, steps: { annoyanceFilters, annoyanceHasBeenAccepted }, telemetry } = useOnboardingStore();
    const [showConsentModal, setShowConsentModal] = useState(false);

    const elLottieRef = useRef<HTMLLottieElement | null>(null);
    const { startLottie, finishLottie } = useLottieElementAdapter(elLottieRef);
    useEffect(startLottie, [startLottie]);

    /**
     *
     */
    function handleBlockAnnoyances() {
        if (annoyanceHasBeenAccepted) {
            finishLottie(async () => steps.shouldBlockAnnoyances(true));
            telemetry.layersRelay.trackEvent(OnboardingEvents.BlockAnnoyancesYesClick);
        } else {
            setShowConsentModal(true);
        }
    }

    /**
     *
     */
    async function handleSkipAnnoyances() {
        await steps.shouldBlockAnnoyances(false);
    }

    /**
     *
     */
    function onConsentEnable() {
        setShowConsentModal(false);
        finishLottie(async () => steps.shouldBlockAnnoyances(true));
        telemetry.layersRelay.trackEvent(OnboardingEvents.BlockAnnoyancesYesClick);
    }

    return (
        <>
            <Step
                pageContainerTestId="onboarding-annoyances-page"
                testIdPrimaryButton="onboarding-annoyances-enable-button"
                testIdSecondaryButton="onboarding-annoyances-dont-block-button"
                description={translate('onboarding.annoyances.desc')}
                elLottieRef={elLottieRef}
                lottie="annoyances"
                primaryButton={{ action: handleBlockAnnoyances, label: translate('onboarding.block.btn') }}
                secondaryButton={{ action: handleSkipAnnoyances, label: translate('onboarding.dont.block.btn') }}
                title={translate('onboarding.annoyances.title')}
                imageSmall
            />
            {showConsentModal && (
                <ConsentModal
                    testIdModal="onboarding-annoyances-consent-modal"
                    testIdEnableButton="onboarding-annoyances-consent-modal-enable"
                    testIdCancelButton="onboarding-annoyances-consent-modal-cancel"
                    filters={annoyanceFilters}
                    onClose={() => setShowConsentModal(false)}
                    onEnable={onConsentEnable}
                />
            )}
        </>
    );
}

export const Annoyances = observer(AnnoyancesComponent);
