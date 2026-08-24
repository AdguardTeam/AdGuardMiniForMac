/* This code was generated automatically by proto-parser tool version 1 */
import { UserRulesCallbackState, EmptyValue } from '../types'

/* Service handles settings lists- public part for external platform calls with methods for ArrayBuffer */
export interface IUserRulesCallbackService {
	/* Fires when user rules were updated through assistant */
	onUserFilterChange(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when the user-rules editor window was closed */
	onUserRulesWindowClosed(param: ArrayBuffer): Promise<EmptyValue>;
}

/* Service handles settings lists- private part for operations with unmarshalled params */
export interface IUserRulesCallbackServiceInternal {
	/* Fires when user rules were updated through assistant*/
	onUserFilterChange(param: UserRulesCallbackState): Promise<EmptyValue>;
	/* Fires when the user-rules editor window was closed*/
	onUserRulesWindowClosed(param: EmptyValue): Promise<EmptyValue>;
}

/* Service handles settings lists */
export class UserRulesCallbackService implements IUserRulesCallbackService {
	userRulesCallbackServiceInternal: IUserRulesCallbackServiceInternal;

	constructor(userRulesCallbackServiceInternal: IUserRulesCallbackServiceInternal) {
		this.userRulesCallbackServiceInternal = userRulesCallbackServiceInternal
	}

	/**
	 * Fires when user rules were updated through assistant
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	onUserFilterChange = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = UserRulesCallbackState.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in UserRulesCallbackService.onUserFilterChange: ${ param }`);
		}
		log.dbg('Callback data', 'UserRulesCallbackService.onUserFilterChange', arg.toObject());
		await this.userRulesCallbackServiceInternal.onUserFilterChange(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when the user-rules editor window was closed
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	onUserRulesWindowClosed = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = EmptyValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in UserRulesCallbackService.onUserRulesWindowClosed: ${ param }`);
		}
		log.dbg('Callback data', 'UserRulesCallbackService.onUserRulesWindowClosed', arg.toObject());
		await this.userRulesCallbackServiceInternal.onUserRulesWindowClosed(arg);
		return new EmptyValue();
	};
}
