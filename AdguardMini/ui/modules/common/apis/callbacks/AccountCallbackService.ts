/* This code was generated automatically by proto-parser tool version 1 */
import { LicenseOrError, EmptyValue } from '../types'

/* Service handles account updates- public part for external platform calls with methods for ArrayBuffer */
export interface IAccountCallbackService {
	/* Fires when license state updated */
	OnLicenseUpdate(param: ArrayBuffer): Promise<EmptyValue>;
}

/* Service handles account updates- private part for operations with unmarshalled params */
export interface IAccountCallbackServiceInternal {
	/* Fires when license state updated*/
	OnLicenseUpdate(param: LicenseOrError): Promise<EmptyValue>;
}

/* Service handles account updates */
export class AccountCallbackService implements IAccountCallbackService {
	accountCallbackServiceInternal: IAccountCallbackServiceInternal;

	constructor(accountCallbackServiceInternal: IAccountCallbackServiceInternal) {
		this.accountCallbackServiceInternal = accountCallbackServiceInternal
	}

	/**
	 * Fires when license state updated
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnLicenseUpdate = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = LicenseOrError.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in AccountCallbackService.OnLicenseUpdate: ${ param }`);
		}
		log.dbg('Callback data', 'AccountCallbackService.OnLicenseUpdate', arg.toObject());
		await this.accountCallbackServiceInternal.OnLicenseUpdate(arg);
		return new EmptyValue();
	};
}
