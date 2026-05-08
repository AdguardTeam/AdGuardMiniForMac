/* This code was generated automatically by proto-parser tool version 1 */
import { SafariExtensionUpdate, EmptyValue, BoolValue, ImportStatus, StringValue, EffectiveThemeValue } from '../types'

/* Service handles settings lists- public part for external platform calls with methods for ArrayBuffer */
export interface ISettingsCallbackService {
	/* Fires when one of extensions updated */
	OnSafariExtensionUpdate(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when the application detects changes in a LoginItem service */
	OnLoginItemStateChange(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when import completed or need to confirm consent */
	OnImportStateChange(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when another hardware acceleration was imported or migrated */
	OnHardwareAccelerationChange(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when resolve if new version is available */
	OnApplicationVersionStatusResolved(param: ArrayBuffer): Promise<EmptyValue>;
	/* Window did become main callback */
	OnWindowDidBecomeMain(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when app requests to show settings page */
	OnSettingsPageRequested(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when effective theme changed */
	OnEffectiveThemeChanged(param: ArrayBuffer): Promise<EmptyValue>;
	/* Settings window was requested to open from tray */
	OnSettingsWindowOpened(param: ArrayBuffer): Promise<EmptyValue>;
}

/* Service handles settings lists- private part for operations with unmarshalled params */
export interface ISettingsCallbackServiceInternal {
	/* Fires when one of extensions updated*/
	OnSafariExtensionUpdate(param: SafariExtensionUpdate): Promise<EmptyValue>;
	/* Fires when the application detects changes in a LoginItem service*/
	OnLoginItemStateChange(param: BoolValue): Promise<EmptyValue>;
	/* Fires when import completed or need to confirm consent*/
	OnImportStateChange(param: ImportStatus): Promise<EmptyValue>;
	/* Fires when another hardware acceleration was imported or migrated*/
	OnHardwareAccelerationChange(param: BoolValue): Promise<EmptyValue>;
	/* Fires when resolve if new version is available*/
	OnApplicationVersionStatusResolved(param: BoolValue): Promise<EmptyValue>;
	/* Window did become main callback*/
	OnWindowDidBecomeMain(param: EmptyValue): Promise<EmptyValue>;
	/* Fires when app requests to show settings page*/
	OnSettingsPageRequested(param: StringValue): Promise<EmptyValue>;
	/* Fires when effective theme changed*/
	OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue>;
	/* Settings window was requested to open from tray*/
	OnSettingsWindowOpened(param: EmptyValue): Promise<EmptyValue>;
}

/* Service handles settings lists */
export class SettingsCallbackService implements ISettingsCallbackService {
	settingsCallbackServiceInternal: ISettingsCallbackServiceInternal;

	constructor(settingsCallbackServiceInternal: ISettingsCallbackServiceInternal) {
		this.settingsCallbackServiceInternal = settingsCallbackServiceInternal
	}

	/**
	 * Fires when one of extensions updated
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnSafariExtensionUpdate = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = SafariExtensionUpdate.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in SettingsCallbackService.OnSafariExtensionUpdate: ${ param }`);
		}
		log.dbg('Callback data', 'SettingsCallbackService.OnSafariExtensionUpdate', arg.toObject());
		await this.settingsCallbackServiceInternal.OnSafariExtensionUpdate(arg);
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
			throw new Error(`Empty parameter in SettingsCallbackService.OnLoginItemStateChange: ${ param }`);
		}
		log.dbg('Callback data', 'SettingsCallbackService.OnLoginItemStateChange', arg.toObject());
		await this.settingsCallbackServiceInternal.OnLoginItemStateChange(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when import completed or need to confirm consent
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnImportStateChange = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = ImportStatus.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in SettingsCallbackService.OnImportStateChange: ${ param }`);
		}
		log.dbg('Callback data', 'SettingsCallbackService.OnImportStateChange', arg.toObject());
		await this.settingsCallbackServiceInternal.OnImportStateChange(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when another hardware acceleration was imported or migrated
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnHardwareAccelerationChange = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = BoolValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in SettingsCallbackService.OnHardwareAccelerationChange: ${ param }`);
		}
		log.dbg('Callback data', 'SettingsCallbackService.OnHardwareAccelerationChange', arg.toObject());
		await this.settingsCallbackServiceInternal.OnHardwareAccelerationChange(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when resolve if new version is available
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnApplicationVersionStatusResolved = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = BoolValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in SettingsCallbackService.OnApplicationVersionStatusResolved: ${ param }`);
		}
		log.dbg('Callback data', 'SettingsCallbackService.OnApplicationVersionStatusResolved', arg.toObject());
		await this.settingsCallbackServiceInternal.OnApplicationVersionStatusResolved(arg);
		return new EmptyValue();
	};
	/**
	 * Window did become main callback
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnWindowDidBecomeMain = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = EmptyValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in SettingsCallbackService.OnWindowDidBecomeMain: ${ param }`);
		}
		log.dbg('Callback data', 'SettingsCallbackService.OnWindowDidBecomeMain', arg.toObject());
		await this.settingsCallbackServiceInternal.OnWindowDidBecomeMain(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when app requests to show settings page
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnSettingsPageRequested = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = StringValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in SettingsCallbackService.OnSettingsPageRequested: ${ param }`);
		}
		log.dbg('Callback data', 'SettingsCallbackService.OnSettingsPageRequested', arg.toObject());
		await this.settingsCallbackServiceInternal.OnSettingsPageRequested(arg);
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
			throw new Error(`Empty parameter in SettingsCallbackService.OnEffectiveThemeChanged: ${ param }`);
		}
		log.dbg('Callback data', 'SettingsCallbackService.OnEffectiveThemeChanged', arg.toObject());
		await this.settingsCallbackServiceInternal.OnEffectiveThemeChanged(arg);
		return new EmptyValue();
	};
	/**
	 * Settings window was requested to open from tray
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnSettingsWindowOpened = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = EmptyValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in SettingsCallbackService.OnSettingsWindowOpened: ${ param }`);
		}
		log.dbg('Callback data', 'SettingsCallbackService.OnSettingsWindowOpened', arg.toObject());
		await this.settingsCallbackServiceInternal.OnSettingsWindowOpened(arg);
		return new EmptyValue();
	};
}
