// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { TDS_PARAMS, getTdsLink } from 'Common/utils/links';
import { EnableAdGuardExtensions } from 'Common/views';
import { useOnboardingStore, useTheme } from 'OnboardingLib/hooks';
import { OnboardingSteps, RouteName } from 'OnboardingStore/modules';

/**
 * Step "Extensions"
 */
function ExtensionsComponent() {
    const { steps } = useOnboardingStore();

    const { safariSettingsHaveBeenOpened } = steps;

    return (
        <EnableAdGuardExtensions
            buttons={
                safariSettingsHaveBeenOpened
                    ? [
                        { buttonType: 'outlined', action: async () => steps.openSafariSettings(), label: translate('onboarding.extensions.open.settings') },
                        { buttonType: 'submit', action: () => steps.setCurrentStep(OnboardingSteps.ads), label: translate('onboarding.extensions.proceed') },
                    ]
                    : [
                        { buttonType: 'submit', action: async () => steps.openSafariSettings(), label: translate('onboarding.extensions.open.settings') },
                    ]
            }
            privacyPolicyUrl={getTdsLink(TDS_PARAMS.privacy, RouteName.onboarding)}
            useTheme={useTheme}
        />
    );
}

export const Extensions = observer(ExtensionsComponent);
