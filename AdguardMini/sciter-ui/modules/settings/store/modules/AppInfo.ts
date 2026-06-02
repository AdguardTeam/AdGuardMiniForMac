// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { GetAboutRequest } from 'Apis/requests/AppInfoService';
import { CheckApplicationVersionRequest } from 'Apis/requests/CommonService';
import { RequestApplicationUpdateRequest } from 'Apis/requests/SettingsService';
import { AppInfo as AppInfoEnt } from 'Apis/types';

import type { SettingsStore } from 'SettingsStore';

const CHECK_UPDATES_INTERVAL = 60 * 1000;

/**
 *  AppInfo store
 */
export class AppInfo {
    /**
     * Debouncer for update checking
     */
    private readonly lastTimeUpdate: number | undefined;

    public rootStore: SettingsStore;

    /**
     * info about application
     */
    public appInfo = new AppInfoEnt();

    /**
     * Bool describes if new version of application is available
     */
    public newVersionAvailable: boolean | undefined = false;

    /**
     * Ctor
     *
     * @param rootStore
     */
    public constructor(rootStore: SettingsStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this, {
            rootStore: false,
        }, { autoBind: true });
    }

    /**
     * Private update helper
     */
    private updateHelper() {
        return new AppInfoEnt({
            channel: this.appInfo.channel,
            dependencies: this.appInfo.dependencies,
            updateAvailable: this.appInfo.updateAvailable,
            version: this.appInfo.version,
        });
    }

    /**
     * private setter for app info
     */
    private setAppInfo(info: AppInfoEnt) {
        this.appInfo = info;
    }

    /**
     * receive app info from sciter
     */
    public async getAppInfo() {
        const resp = await window.API.Execute(new GetAboutRequest());
        this.setAppInfo(resp);
    }

    /**
     * Start the process of checking version updates
     */
    public checkApplicationVersion() {
        if (Date.now() < (this.lastTimeUpdate || 0) + CHECK_UPDATES_INTERVAL) {
            return;
        }
        window.API.Execute(new CheckApplicationVersionRequest());
    }

    /**
     * Set application update status
     */
    public setNewVersionAvailable(newVersionAvailable: boolean) {
        this.newVersionAvailable = newVersionAvailable;
    }

    /**
     * Request update of application
     */
    public async requestUpdate() {
        window.API.Execute(new RequestApplicationUpdateRequest());
    }

    /**
     * Setter for updateAvailable field
     */
    public setUpdateAvailable(updateAvailable: boolean) {
        const appInfo = this.updateHelper();
        appInfo.updateAvailable = updateAvailable;
        this.setAppInfo(appInfo);
    }
}
