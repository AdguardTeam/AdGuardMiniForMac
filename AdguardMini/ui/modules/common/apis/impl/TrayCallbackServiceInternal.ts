// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* Implementation of the generated interface; the generator never overwrites this file. */
import { store } from 'TrayStore';

import { EmptyValue } from '../types';

import type { ITrayCallbackServiceInternal } from '../callbacks/TrayCallbackService';
import type { BoolValue, ApplicationVersionStatus, FiltersStatus, SafariExtensionUpdate, TrayLicenseOrError, EffectiveThemeValue, StringValue } from '../types';

/* Service handles settings lists  */
export class TrayCallbackServiceInternal implements ITrayCallbackServiceInternal {
    public async OnTrayWindowVisibilityChange(param: BoolValue): Promise<EmptyValue> {
        store.callbackService.OnTrayWindowVisibilityChange(param);
        return new EmptyValue();
    }

    public async OnLoginItemStateChange(param: BoolValue): Promise<EmptyValue> {
        store.callbackService.OnLoginItemStateChange(param);
        return new EmptyValue();
    }

    /* Fires when swift resolved the version check, carrying the available version */
    public async OnApplicationVersionStatusResolved(param: ApplicationVersionStatus): Promise<EmptyValue> {
        store.callbackService.OnApplicationVersionStatusResolved(param);
        return new EmptyValue();
    }

    /* Fires when swift resolve filters current state */
    public async OnFilterStatusResolved(param: FiltersStatus): Promise<EmptyValue> {
        store.callbackService.OnFilterStatusResolved(param);
        return new EmptyValue();
    }

    /* Fires when one of extensions updated */
    public async OnSafariExtensionUpdate(param: SafariExtensionUpdate): Promise<EmptyValue> {
        store.callbackService.OnSafariExtensionUpdate(param);
        return new EmptyValue();
    }

    /* Fires when license state updated. Push carries the tray-scoped view */
    public async OnLicenseUpdate(param: TrayLicenseOrError): Promise<EmptyValue> {
        store.callbackService.OnLicenseUpdate(param);
        return new EmptyValue();
    }

    /* Fires when effective theme changed */
    public async OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue> {
        store.callbackService.OnEffectiveThemeChanged(param);
        return new EmptyValue();
    }

    public async OnTrayPageRequested(param: StringValue): Promise<EmptyValue> {
        store.callbackService.OnTrayPageRequested(param);
        return new EmptyValue();
    }

    /* Fires when the Apple Mail tracking protection switch changes */
    public async OnMailProtectionChanged(param: BoolValue): Promise<EmptyValue> {
        store.callbackService.OnMailProtectionChanged(param);
        return new EmptyValue();
    }
}
