// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TrayLicense.ts
//  AdguardMini
//

import { makeAutoObservable } from 'mobx';

import type { LicenseOrErrorExtended } from 'Apis/ExtendLicense';
import type { LicenseStore } from 'Common/stores/LicenseStore';

/**
 * Tray license display — delegates all logic to shared LicenseStore.
 */
export class TrayLicense {
    // This should be private but due to MobX typings we make it public or we have error in makeAutoObservable
    public readonly licenseStore: LicenseStore;

    /** Delegated to LicenseStore */
    public get isLicenseOrTrialActive(): boolean {
        return this.licenseStore.isLicenseOrTrialActive;
    }

    /** Delegated to LicenseStore */
    public get isLicenseActive(): boolean {
        return this.licenseStore.isLicenseActive;
    }

    /** Delegated to LicenseStore */
    public get isTrialActive(): boolean {
        return this.licenseStore.isTrialActive;
    }

    /** Delegated to LicenseStore */
    public get isLicenseBind(): boolean {
        return this.licenseStore.isLicenseExist && !!this.licenseStore.license.license?.applicationKeyOwner;
    }

    /** Delegated to LicenseStore */
    public get trialAvailableDays(): number {
        return this.licenseStore.trialAvailableDays;
    }

    /**
     * Ctor
     *
     * @param licenseStore Shared license store
     */
    constructor(licenseStore: LicenseStore) {
        this.licenseStore = licenseStore;
        makeAutoObservable(this, {
            licenseStore: false,
        }, { autoBind: true });
    }

    /**
     * Receive user current license (delegates)
     */
    public async getLicense(): Promise<void> {
        await this.licenseStore.getLicense();
    }

    /**
     * Local setter for license (delegates)
     */
    public setLicense(license: LicenseOrErrorExtended): void {
        this.licenseStore.setLicense(license);
    }

    /**
     * Gets trial availability status (delegates)
     */
    public async getTrialAvailability(): Promise<void> {
        await this.licenseStore.getTrialAvailability();
    }
}
