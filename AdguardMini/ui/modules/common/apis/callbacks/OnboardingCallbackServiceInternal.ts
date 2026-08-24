/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'OnboardingStore';
import { IOnboardingCallbackServiceInternal } from './OnboardingCallbackService';
import { EmptyValue, EffectiveThemeValue } from '../types'

/* Service handles onboarding updates  */
export class OnboardingCallbackServiceInternal  implements IOnboardingCallbackServiceInternal {
    /* Fires when effective theme changed */
    async OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue> {
        store.steps.setEffectiveTheme(param.value);

        return new EmptyValue();
    }
}
