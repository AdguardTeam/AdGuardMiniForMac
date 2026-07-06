// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ImportExport.ts
//  AdguardMini
//

import { makeAutoObservable } from 'mobx';

import { ExportSettingsRequest, ImportSettingsConfirmRequest, ImportSettingsRequest } from 'Apis/requests/SettingsService';

import type { AppSettings } from './AppSettings';
import type { ImportMode } from 'Apis/types';

/**
 * Settings import/export/reset flow with consent management.
 */
export class ImportExport {
    // This should be private but due to MobX typings we make it public or we have error in makeAutoObservable
    public readonly appSettings: AppSettings;

    /**
     * Confirm mode of import — saved to show notification after import
     */
    public confirmMode: ImportMode | undefined;

    /**
     * Ctor
     *
     * @param appSettings App settings store for refresh after import
     */
    constructor(appSettings: AppSettings) {
        this.appSettings = appSettings;
        makeAutoObservable(this, {
            appSettings: false,
        }, { autoBind: true });
    }

    /**
     * Export settings to selected destination
     */
    public async exportSettings(path: string) {
        return window.API.Execute(new ExportSettingsRequest({ path }));
    }

    /**
     * Import app settings from selected destination
     */
    public async importSettings(path: string) {
        await window.API.Execute(new ImportSettingsRequest({ path }));
    }

    /**
     * Confirm type of import
     */
    public confirmImport(mode: ImportMode) {
        this.confirmMode = mode;
        window.API.Execute(new ImportSettingsConfirmRequest({ mode }));
    }

    /**
     * On import success — reset consent state and refresh settings
     */
    public onImportSuccess() {
        this.confirmMode = undefined;
        this.appSettings.setShouldGiveConsent([]);
        this.appSettings.getSettings();
    }
}
