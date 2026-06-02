// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useOnboardingStore } from 'OnboardingLib/hooks';
import { OnboardingSteps } from 'OnboardingStore/modules';
import theme from 'Theme';
import { Button } from 'UILib';

import s from './StepHeader.module.pcss';

/**
 * Header for Step component
 */
function StepHeaderComponent() {
    const { steps } = useOnboardingStore();

    const { currentStep, safariExtensionsStore: { allExtensionsEnabled }, skipTuning } = steps;

    const renderBackButton = () => {
        let prevStep: OnboardingSteps | undefined;
        switch (currentStep) {
            case OnboardingSteps.start:
                break;
            case OnboardingSteps.extensions:
                break;
            case OnboardingSteps.ads:
                prevStep = allExtensionsEnabled ? undefined : OnboardingSteps.extensions;
                break;
            case OnboardingSteps.trackers:
                prevStep = OnboardingSteps.ads;
                break;
            case OnboardingSteps.annoyances:
                prevStep = OnboardingSteps.trackers;
                break;
            case OnboardingSteps.finish:
                prevStep = skipTuning ? OnboardingSteps.ads : OnboardingSteps.annoyances;
                break;
        }
        if (prevStep) {
            return (
                <Button
                    icon="arrow_left"
                    iconClassName={theme.button.grayIcon}
                    type="icon"
                    onClick={() => steps.setCurrentStep(prevStep!)}
                />
            );
        }
    };

    return (
        <div className={s.StepHeader_container}>
            {renderBackButton()}
        </div>
    );
}

export const StepHeader = observer(StepHeaderComponent);
