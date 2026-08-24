// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { YouAreAllSet } from 'Common/views';
import { useOnboardingStore } from 'OnboardingLib/hooks';

import { StepHeader } from '../StepHeader';

/**
 * Step "Finish"
 */
function FinishComponent() {
    const { steps } = useOnboardingStore();

    return (
        <YouAreAllSet
            description={translate('onboarding.finish.desc')}
            handler={
                { action: async () => steps.completeOnboarding(), label: translate('onboarding.finish.btn') }
            }
            headerSlot={<StepHeader />}
        />
    );
}

export const Finish = observer(FinishComponent);
