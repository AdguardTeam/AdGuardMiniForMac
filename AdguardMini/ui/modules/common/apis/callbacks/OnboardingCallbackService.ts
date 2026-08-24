/* This code was generated automatically by proto-parser tool version 1 */
import { EffectiveThemeValue, EmptyValue } from '../types'

/* Service handles onboarding updates- public part for external platform calls with methods for ArrayBuffer */
export interface IOnboardingCallbackService {
	/* Fires when effective theme changed */
	OnEffectiveThemeChanged(param: ArrayBuffer): Promise<EmptyValue>;
}

/* Service handles onboarding updates- private part for operations with unmarshalled params */
export interface IOnboardingCallbackServiceInternal {
	/* Fires when effective theme changed*/
	OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue>;
}

/* Service handles onboarding updates */
export class OnboardingCallbackService implements IOnboardingCallbackService {
	onboardingCallbackServiceInternal: IOnboardingCallbackServiceInternal;

	constructor(onboardingCallbackServiceInternal: IOnboardingCallbackServiceInternal) {
		this.onboardingCallbackServiceInternal = onboardingCallbackServiceInternal
	}

	/**
	 * Fires when effective theme changed
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnEffectiveThemeChanged = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = EffectiveThemeValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in OnboardingCallbackService.OnEffectiveThemeChanged: ${ param }`);
		}
		log.dbg('Callback data', 'OnboardingCallbackService.OnEffectiveThemeChanged', arg.toObject());
		await this.onboardingCallbackServiceInternal.OnEffectiveThemeChanged(arg);
		return new EmptyValue();
	};
}
