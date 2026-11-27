// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* Implementation of the generated interface; the generator never overwrites this file. */
import { store } from 'SettingsStore';

import { EmptyValue } from '../types';

import type { IAccountCallbackServiceInternal } from '../callbacks/AccountCallbackService';
import type { LicenseOrError } from '../types';
import type { LicenseOrErrorExtended } from 'Apis/ExtendLicense';

/* Service handles account updates  */
export class AccountCallbackServiceInternal implements IAccountCallbackServiceInternal {
    public async OnLicenseUpdate(param: LicenseOrError): Promise<EmptyValue> {
        await store.account.getTrialAvailability();
        store.account.setLicense(param as unknown as LicenseOrErrorExtended);
        store.settings.getSettings();
        store.advancedBlocking.getAdvancedBlocking();
        return new EmptyValue();
    }
}
