/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'SettingsStore';

import { ISettingsCallbackServiceInternal } from './SettingsCallbackService';;
import { SafariExtensionUpdate, EmptyValue, BoolValue, ImportStatus, StringValue, EffectiveThemeValue } from '../types'

/* Service handles settings lists  */
export class SettingsCallbackServiceInternal  implements ISettingsCallbackServiceInternal {
    async OnSafariExtensionUpdate(param: SafariExtensionUpdate): Promise<EmptyValue> {
        store.callbackHandlers.onSafariExtensionUpdate(param);
        return new EmptyValue();
    }

    async OnLoginItemStateChange(param: BoolValue): Promise<EmptyValue> {
        store.callbackHandlers.onLoginItemStateChange(param);
        return new EmptyValue();
    }

    async OnImportStateChange(param: ImportStatus): Promise<EmptyValue> {
        store.callbackHandlers.onImportStateChange(param);
        return new EmptyValue();
    }

    async OnHardwareAccelerationChange(param: BoolValue): Promise<EmptyValue> {
        store.callbackHandlers.onHardwareAccelerationChange(param);
        return new EmptyValue();
    }

    async OnApplicationVersionStatusResolved(param: BoolValue): Promise<EmptyValue> {
        store.callbackHandlers.onApplicationVersionStatusResolved(param);
        return new EmptyValue();
    }

    async OnWindowDidBecomeMain(_param: EmptyValue) {
        store.callbackHandlers.onWindowDidBecomeMain();
        return new EmptyValue();
    }

    async OnSettingsPageRequested(param: StringValue): Promise<EmptyValue> {
        store.callbackHandlers.onSettingsPageRequested(param);
        return new EmptyValue();
    }

    /* Fires when effective theme changed */
    async OnEffectiveThemeChanged(param: EffectiveThemeValue): Promise<EmptyValue> {
        store.callbackHandlers.onEffectiveThemeChanged(param);
        return new EmptyValue();
    }

    /* Fires when settings window is opened */
    async OnSettingsWindowOpened(_param: EmptyValue): Promise<EmptyValue> {
        store.callbackHandlers.onSettingsWindowOpened();
        return new EmptyValue();
    }
}
