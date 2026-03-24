/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'TrayStore';
import { ITrayCallbackServiceInternal } from './TrayCallbackService';
import { BoolValue, EmptyValue, FiltersStatus, SafariExtensionUpdate, LicenseOrError, EffectiveThemeValue } from '../types'
import { TrayRoute } from 'TrayStore/modules/TrayRouter';
import { TrayPage } from 'Modules/tray/store/modules';

/* Service handles settings lists  */
export class TrayCallbackServiceInternal implements ITrayCallbackServiceInternal {
    async OnTrayWindowVisibilityChange(param: BoolValue): Promise<EmptyValue> {
        if (param.value) {
            store.settings.getSettings();
            store.settings.getStatistics();
            store.telemetry.setPage(TrayPage.TrayMenu);
            store.telemetry.trackPageView();
        } else {
            store.router.changePath(TrayRoute.home);
        }

        store.settings.getAdvancedBlocking();
        store.trayWindowVisibilityChanged.invoke(param.value);

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
}
