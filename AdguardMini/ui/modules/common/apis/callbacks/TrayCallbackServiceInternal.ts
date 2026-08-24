/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'TrayStore';
import { ITrayCallbackServiceInternal } from './TrayCallbackService';
import { BoolValue, EmptyValue, FiltersStatus, SafariExtensionUpdate, TrayLicenseOrError, EffectiveThemeValue, StringValue } from '../types'


/* Service handles settings lists  */
export class TrayCallbackServiceInternal implements ITrayCallbackServiceInternal {
    async OnTrayWindowVisibilityChange(param: BoolValue): Promise<EmptyValue> {
        store.callbackService.OnTrayWindowVisibilityChange(param);
        return new EmptyValue();
    }
    async OnLoginItemStateChange(param: BoolValue): Promise<EmptyValue> {
        store.callbackService.OnLoginItemStateChange(param);
        return new EmptyValue();
    }

	/* Fires when swift resolve if new version is available */
	async OnApplicationVersionStatusResolved(param: BoolValue): Promise<EmptyValue> {
        store.callbackService.OnApplicationVersionStatusResolved(param);
        return new EmptyValue();
    }

	/* Fires when swift resolve filters current state */
	async OnFilterStatusResolved(param: FiltersStatus): Promise<EmptyValue> {
        store.callbackService.OnFilterStatusResolved(param);
        return new EmptyValue();
    }

    /* Fires when one of extensions updated*/
	async OnSafariExtensionUpdate(param: SafariExtensionUpdate): Promise<EmptyValue> {
        store.callbackService.OnSafariExtensionUpdate(param);
        return new EmptyValue();
    }

    /* Fires when license state updated. Push carries the tray-scoped view */
    async OnLicenseUpdate(param: TrayLicenseOrError): Promise<EmptyValue> {
        store.callbackService.OnLicenseUpdate(param);
        return new EmptyValue();
    }

    /* Fires when effective theme changed */
    async OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue> {
        store.callbackService.OnEffectiveThemeChanged(param);
        return new EmptyValue();
    }

    async OnTrayPageRequested(param: StringValue): Promise<EmptyValue> {
        store.callbackService.OnTrayPageRequested(param);
        return new EmptyValue();
    }
}
