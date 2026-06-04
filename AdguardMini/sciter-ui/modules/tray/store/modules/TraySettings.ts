// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TraySettings.ts
//  AdguardMini
//

import { LogLevel } from '@adg/sciter-utils-kit';
import { makeAutoObservable } from 'mobx';

import { CheckApplicationVersionRequest } from 'Apis/requests/CommonService';
import { OpenSettingsWindowRequest } from 'Apis/requests/InternalService';
import { GetTraySettingsRequest, UpdateTraySettingsRequest, RequestOpenSettingsPageRequest } from 'Apis/requests/TrayService';
import { GlobalSettings, ReleaseVariants } from 'Apis/types';
import { updateLanguage } from 'Intl';

import type { AdvancedBlocking } from 'Apis/types';
import type { LicenseStore } from 'Common/stores/LicenseStore';
import type { StoryId } from 'Modules/tray/modules/stories/model';

/**
 * Tray global settings management.
 */
export class TraySettings {
    // This should be private but due to MobX typings we make it public or we have error in makeAutoObservable
    public readonly licenseStore: LicenseStore;

    public settings: GlobalSettings | null = null;

    /**
     * Bool describes if login item is enabled
     */
    public loginItemEnabled = true;

    /**
     * Bool describes if new version is available, undefined for pending
     */
    public newVersionAvailable: boolean | undefined = false;

    /**
     * Advanced blocking status
     */
    public advancedBlocking: AdvancedBlocking | null = null;

    /**
     * Set of completed stories
     */
    public storyCompleted: Set<StoryId> = new Set();

    /**
     * Checks if the app release variant is the MAS
     */
    public get isMASReleaseVariant(): boolean {
        return this.settings?.releaseVariant === ReleaseVariants.MAS;
    }

    /**
     * Ctor — self-initializes
     */
    constructor(
        licenseStore: LicenseStore,
    ) {
        this.licenseStore = licenseStore;
        makeAutoObservable(this, {
            licenseStore: false,
        }, { autoBind: true });
        this.getSettings();
    }

    /**
     * Helper for update
     */
    private buildGlobalSettings(): GlobalSettings {
        const newValue = new GlobalSettings();
        if (this.settings) {
            newValue.enabled = this.settings.enabled;
            newValue.newVersionAvailable = this.settings.newVersionAvailable;
            newValue.releaseVariant = this.settings.releaseVariant;
            newValue.language = this.settings.language;
            newValue.debugLogging = this.settings.debugLogging;
            newValue.allowTelemetry = this.settings.allowTelemetry;
            newValue.theme = this.settings.theme;
            newValue.lastFiltersUpdateTimestampMs = this.settings.lastFiltersUpdateTimestampMs;
        }
        return newValue;
    }

    /**
     * Set completed story
     */
    public setCompletedStory(storyId: StoryId): void {
        this.storyCompleted.add(storyId);
    }

    /**
     * Get tray settings
     */
    public async getSettings(): Promise<void> {
        const data = await window.API.Execute(new GetTraySettingsRequest());
        this.setSettings(data);
    }

    /**
     * Update tray settings
     */
    public async updateSettings(enabled: boolean): Promise<void> {
        const newValue = this.buildGlobalSettings();
        newValue.enabled = enabled;
        this.setSettings(newValue);
        await window.API.Execute(new UpdateTraySettingsRequest(newValue));
    }

    /**
     * Set Settings of tray
     */
    public setSettings(settings: GlobalSettings): void {
        this.settings = settings;
        this.newVersionAvailable = settings.newVersionAvailable;
        log.setLogLevel(settings.debugLogging ? LogLevel.DBG : LogLevel.ERR);
        updateLanguage(settings.language);
    }

    /**
     * Set login item status
     */
    public setLoginItem(enabled: boolean): void {
        this.loginItemEnabled = enabled;
    }

    /**
     * Check application version
     */
    public checkApplicationVersion(): void {
        window.API.Execute(new CheckApplicationVersionRequest());
        this.newVersionAvailable = undefined;
    }

    /**
     * Set application update status
     */
    public setNewVersionAvailable(newVersionAvailable: boolean): void {
        this.newVersionAvailable = newVersionAvailable;
    }

    /**
     * Use to open paywall screen
     */
    public requestOpenPaywallScreen(): void {
        window.API.Execute(new OpenSettingsWindowRequest());
        window.API.Execute(new RequestOpenSettingsPageRequest({ value: 'paywall' }));
    }
}
