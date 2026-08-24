// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useOnboardingStore } from 'OnboardingLib/hooks';
import { RouteName } from 'OnboardingStore/modules';

import { Onboarding } from '../Onboarding';

/**
 * Component for handling Routes. Depending on RouterStore display current page
 */
function RouterComponent() {
    const { router, steps: { systemLanguage } } = useOnboardingStore();
    switch (router.currentPath) {
        case RouteName.onboarding:
            return <Onboarding key={systemLanguage} />;
    }
}

export const Router = observer(RouterComponent);
