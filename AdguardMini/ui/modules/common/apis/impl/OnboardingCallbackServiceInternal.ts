// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* Implementation of the generated interface; the generator never overwrites this file. */
import { store } from 'OnboardingStore';

import { EmptyValue } from '../types';

import type { IOnboardingCallbackServiceInternal } from '../callbacks/OnboardingCallbackService';
import type { EffectiveThemeValue } from '../types';

/* Service handles onboarding updates  */
export class OnboardingCallbackServiceInternal implements IOnboardingCallbackServiceInternal {
    /* Fires when effective theme changed */
    public async OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue> {
        store.steps.setEffectiveTheme(param.value);

        return new EmptyValue();
    }
}
