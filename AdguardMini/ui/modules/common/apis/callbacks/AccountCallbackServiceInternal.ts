/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'SettingsStore';
import { IAccountCallbackServiceInternal } from './AccountCallbackService';
import { LicenseOrErrorExtended } from 'Apis/ExtendLicense';
import { EmptyValue, LicenseOrError } from '../types'

/* Service handles account updates  */
export class AccountCallbackServiceInternal  implements IAccountCallbackServiceInternal {
    async OnLicenseUpdate(param: LicenseOrError): Promise<EmptyValue> {
        await store.account.getTrialAvailability();
        store.account.setLicense(param as unknown as LicenseOrErrorExtended);
        store.settings.getSettings();
        store.advancedBlocking.getAdvancedBlocking();
        return new EmptyValue();
    }
}
