/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'TrayStore';
import { ITrayCallbackServiceInternal } from './TrayCallbackService';
import { BoolValue, EmptyValue, FiltersStatus, SafariExtensionUpdate, LicenseOrError, EffectiveThemeValue, StringValue } from '../types'

/* Service handles settings lists  */
export class TrayCallbackServiceInternal implements ITrayCallbackServiceInternal {
    async OnTrayWindowVisibilityChange(param: BoolValue): Promise<EmptyValue> {
        await store.callbackHandlers.onWindowVisibilityChanged(param.value);
        return new EmptyValue();
    }

    async OnLoginItemStateChange(param: BoolValue): Promise<EmptyValue> {
        store.callbackHandlers.onLoginItemStateChange(param);
        return new EmptyValue();
    }

	/* Fires when swift resolve if new version is available */
	async OnApplicationVersionStatusResolved(param: BoolValue): Promise<EmptyValue> {
        store.callbackHandlers.onApplicationVersionStatusResolved(param);
        return new EmptyValue();
    }

	/* Fires when swift resolve filters current state */
	async OnFilterStatusResolved(param: FiltersStatus): Promise<EmptyValue> {
        store.callbackHandlers.onFilterStatusResolved(param);
        return new EmptyValue();
    }

    /* Fires when one of extensions updated*/
	async OnSafariExtensionUpdate(param: SafariExtensionUpdate): Promise<EmptyValue> {
        store.callbackHandlers.onSafariExtensionUpdate(param);
        return new EmptyValue();
    }

    /* Fires when license state updated */
    async OnLicenseUpdate(param: LicenseOrError): Promise<EmptyValue> {
        store.callbackHandlers.onLicenseUpdate(param);
        return new EmptyValue();
    }

    /* Fires when effective theme changed */
    async OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue> {
        store.callbackHandlers.onEffectiveThemeChanged(param);
        return new EmptyValue();
    }

    async OnTrayPageRequested(param: StringValue): Promise<EmptyValue> {
        store.callbackHandlers.onTrayPageRequested(param);
        return new EmptyValue();
    }
}
