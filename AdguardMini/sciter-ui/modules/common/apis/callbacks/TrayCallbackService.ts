/* This code was generated automatically by proto-parser tool version 1 */
import { BoolValue, EmptyValue, FiltersStatus, SafariExtensionUpdate, TrayLicenseOrError, EffectiveThemeValue, StringValue } from '../types'

/* Service handles settings lists- public part for external platform calls with methods for ArrayBuffer */
export interface ITrayCallbackService {
	/* On tray window open */
	OnTrayWindowVisibilityChange(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when the application detects changes in a LoginItem service */
	OnLoginItemStateChange(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when swift resolve if new version is available */
	OnApplicationVersionStatusResolved(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when swift resolve filters current state */
	OnFilterStatusResolved(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when one of extensions updated */
	OnSafariExtensionUpdate(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when license state updated. Tray-scoped: carries only the fields the tray
	 * reads */
	OnLicenseUpdate(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when effective theme changed */
	OnEffectiveThemeChanged(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when tray should open specific page */
	OnTrayPageRequested(param: ArrayBuffer): Promise<EmptyValue>;
}

/* Service handles settings lists- private part for operations with unmarshalled params */
export interface ITrayCallbackServiceInternal {
	/* On tray window open*/
	OnTrayWindowVisibilityChange(param: BoolValue): Promise<EmptyValue>;
	/* Fires when the application detects changes in a LoginItem service*/
	OnLoginItemStateChange(param: BoolValue): Promise<EmptyValue>;
	/* Fires when swift resolve if new version is available*/
	OnApplicationVersionStatusResolved(param: BoolValue): Promise<EmptyValue>;
	/* Fires when swift resolve filters current state*/
	OnFilterStatusResolved(param: FiltersStatus): Promise<EmptyValue>;
	/* Fires when one of extensions updated*/
	OnSafariExtensionUpdate(param: SafariExtensionUpdate): Promise<EmptyValue>;
	/* Fires when license state updated. Tray-scoped: carries only the fields the tray
	 * reads*/
	OnLicenseUpdate(param: TrayLicenseOrError): Promise<EmptyValue>;
	/* Fires when effective theme changed*/
	OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue>;
	/* Fires when tray should open specific page*/
	OnTrayPageRequested(param: StringValue): Promise<EmptyValue>;
}

/* Service handles settings lists */
export class TrayCallbackService implements ITrayCallbackService {
	trayCallbackServiceInternal: ITrayCallbackServiceInternal;

	constructor(trayCallbackServiceInternal: ITrayCallbackServiceInternal) {
		this.trayCallbackServiceInternal = trayCallbackServiceInternal
	}

	/**
	 * On tray window open
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnTrayWindowVisibilityChange = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = BoolValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in TrayCallbackService.OnTrayWindowVisibilityChange: ${ param }`);
		}
		log.dbg('Callback data', 'TrayCallbackService.OnTrayWindowVisibilityChange', arg.toObject());
		await this.trayCallbackServiceInternal.OnTrayWindowVisibilityChange(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when the application detects changes in a LoginItem service
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnLoginItemStateChange = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = BoolValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in TrayCallbackService.OnLoginItemStateChange: ${ param }`);
		}
		log.dbg('Callback data', 'TrayCallbackService.OnLoginItemStateChange', arg.toObject());
		await this.trayCallbackServiceInternal.OnLoginItemStateChange(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when swift resolve if new version is available
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnApplicationVersionStatusResolved = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = BoolValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in TrayCallbackService.OnApplicationVersionStatusResolved: ${ param }`);
		}
		log.dbg('Callback data', 'TrayCallbackService.OnApplicationVersionStatusResolved', arg.toObject());
		await this.trayCallbackServiceInternal.OnApplicationVersionStatusResolved(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when swift resolve filters current state
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnFilterStatusResolved = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = FiltersStatus.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in TrayCallbackService.OnFilterStatusResolved: ${ param }`);
		}
		log.dbg('Callback data', 'TrayCallbackService.OnFilterStatusResolved', arg.toObject());
		await this.trayCallbackServiceInternal.OnFilterStatusResolved(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when one of extensions updated
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnSafariExtensionUpdate = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = SafariExtensionUpdate.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in TrayCallbackService.OnSafariExtensionUpdate: ${ param }`);
		}
		log.dbg('Callback data', 'TrayCallbackService.OnSafariExtensionUpdate', arg.toObject());
		await this.trayCallbackServiceInternal.OnSafariExtensionUpdate(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when license state updated. Tray-scoped: carries only the fields the tray
	 * reads
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnLicenseUpdate = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = TrayLicenseOrError.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in TrayCallbackService.OnLicenseUpdate: ${ param }`);
		}
		log.dbg('Callback data', 'TrayCallbackService.OnLicenseUpdate', arg.toObject());
		await this.trayCallbackServiceInternal.OnLicenseUpdate(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when effective theme changed
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnEffectiveThemeChanged = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = EffectiveThemeValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in TrayCallbackService.OnEffectiveThemeChanged: ${ param }`);
		}
		log.dbg('Callback data', 'TrayCallbackService.OnEffectiveThemeChanged', arg.toObject());
		await this.trayCallbackServiceInternal.OnEffectiveThemeChanged(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when tray should open specific page
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnTrayPageRequested = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = StringValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in TrayCallbackService.OnTrayPageRequested: ${ param }`);
		}
		log.dbg('Callback data', 'TrayCallbackService.OnTrayPageRequested', arg.toObject());
		await this.trayCallbackServiceInternal.OnTrayPageRequested(arg);
		return new EmptyValue();
	};
}
