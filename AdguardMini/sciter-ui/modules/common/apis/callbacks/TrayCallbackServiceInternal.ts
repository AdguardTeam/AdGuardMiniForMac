/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'TrayStore';
import { ITrayCallbackServiceInternal } from './TrayCallbackService';
import { BoolValue, EmptyValue, FiltersStatus, SafariExtensionUpdate, LicenseOrError, EffectiveThemeValue, StringValue } from '../types'
import { TrayRoute } from 'TrayStore/modules/TrayRouter';

/* Service handles settings lists  */
export class TrayCallbackServiceInternal implements ITrayCallbackServiceInternal {
    async OnTrayWindowVisibilityChange(param: BoolValue): Promise<EmptyValue> {
        await store.onWindowVisibilityChanged(param.value);
        return new EmptyValue();
    }
    async OnLoginItemStateChange(param: BoolValue): Promise<EmptyValue> {
        store.settings.setLoginItem(param.value);
        return new EmptyValue();
    }

	/* Fires when swift resolve if new version is available */
	async OnApplicationVersionStatusResolved(param: BoolValue): Promise<EmptyValue> {
        store.settings.setNewVersionAvailable(param.value);
        return new EmptyValue();
    }

	/* Fires when swift resolve filters current state */
	async OnFilterStatusResolved(param: FiltersStatus): Promise<EmptyValue> {
        store.settings.setFiltersStatus(param);
        // Refresh global settings here to pull the latest lastFiltersUpdateTimestampMs
        // right after Swift reports final filter update status.
        await store.settings.getSettings();
        return new EmptyValue();
    }

    /* Fires when one of extensions updated*/
	async OnSafariExtensionUpdate(param: SafariExtensionUpdate): Promise<EmptyValue> {
        store.settings.updateSafariExtension(param);
        return new EmptyValue();
    }

    /* Fires when license state updated */
    async OnLicenseUpdate(param: LicenseOrError): Promise<EmptyValue> {
        store.settings.setLicense(param);
        store.settings.getAdvancedBlocking();
        return new EmptyValue();
    }

    /* Fires when effective theme changed */
    async OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue> {
        store.trayWindowEffectiveThemeChanged.invoke(param.value);

        return new EmptyValue();
    }

    async OnTrayPageRequested(param: StringValue): Promise<EmptyValue> {
        if (Object.values(TrayRoute).includes(param.value as TrayRoute)) {
            store.router.changePath(param.value as TrayRoute);
        }

        return new EmptyValue();
    }
}
