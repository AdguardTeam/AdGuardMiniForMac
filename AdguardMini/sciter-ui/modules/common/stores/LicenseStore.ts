// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LicenseStore.ts
//  AdguardMini
//

import { makeAutoObservable } from 'mobx';

import { GetLicenseRequest, GetTrialAvailableDaysRequest } from 'Apis/requests/AccountService';
import { LicenseOrError, LicenseStatus } from 'Apis/types';

import type { LicenseOrErrorExtended } from 'Apis/ExtendLicense';

/**
 * Shared store for license state and status computation.
 * Used by settings Account, tray TrayLicense, and onboarding.
 */
export class LicenseStore {
    /**
     * User License
     */
    public license = new LicenseOrError({ error: true }) as unknown as LicenseOrErrorExtended;

    /**
     * Trial availability status — available days, 0 = trial unavailable
     */
    public trialAvailableDays = 0;

    /**
     * Checks if the license object exists
     */
    public get hasLicense(): boolean {
        return this.license.hasLicense;
    }

    /**
     * Checks if the license exists with a key
     */
    public get isLicenseExist(): boolean {
        return this.hasLicense && Boolean(this.license.license?.licenseKey);
    }

    /**
     * Checks if trial is expired
     */
    public get isTrialExpired(): boolean {
        return this.hasLicense && !this.isLicenseExist
            && this.license.license?.status === LicenseStatus.expired;
    }

    /**
     * Checks if license is expired
     */
    public get isLicenseExpired(): boolean {
        return this.hasLicense && this.isLicenseExist
            && this.license.license?.status === LicenseStatus.expired;
    }

    /**
     * Checks if the license status is active or trial
     */
    public get isLicenseOrTrialActive(): boolean {
        return this.isLicenseActive || this.isTrialActive;
    }

    /**
     * Checks if the license is active
     */
    public get isLicenseActive(): boolean {
        return this.hasLicense && this.license.license?.status === LicenseStatus.active;
    }

    /**
     * Checks if the trial is active
     */
    public get isTrialActive(): boolean {
        return this.hasLicense
            && this.license.license?.status === LicenseStatus.active
            && this.license.license?.licenseTrial;
    }

    /**
     * Checks if the license is trial
     */
    public get isTrial(): boolean {
        return !!(this.hasLicense && this.license.license?.licenseTrial);
    }

    /**
     * Checks if the license status is blocked
     */
    public get isLicenseBlocked(): boolean {
        return this.hasLicense && this.license.license?.status === LicenseStatus.blocked;
    }

    /**
     * Checks if the license status is blocked app id
     */
    public get isLicenseBlockedAppId(): boolean {
        return this.hasLicense && this.license.license?.status === LicenseStatus.blocked_app_id;
    }

    /**
     * Checks if the trial exists
     */
    public get isTrialExist(): boolean {
        return this.isLicenseExist
            && [LicenseStatus.trial, LicenseStatus.active, LicenseStatus.expired].includes(
                this.license.license!.status,
            ) && !!this.license.license?.licenseTrial;
    }

    /**
     * Checks if the application license status is free
     */
    public get isFreeware(): boolean {
        return this.hasLicense && this.license.license?.status === LicenseStatus.free;
    }

    /**
     * Checks if the App Store subscription exists
     */
    public get isAppStoreSubscription(): boolean {
        return this.hasLicense && !!this.license.license?.appStoreSubscription;
    }

    /**
     * Ctor — self-initializes by fetching license data
     */
    constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
    }

    /**
     * Receive user current license
     */
    public async getLicense(): Promise<void> {
        try {
            const resp = await window.API.Execute(new GetLicenseRequest());
            this.setLicense(resp as unknown as LicenseOrErrorExtended);
        } catch (err) {
            log.error('LicenseStore.getLicense failed', String(err));
        }
    }

    /**
     * Local setter for license
     */
    public setLicense(license: LicenseOrErrorExtended): void {
        this.license = license;
    }

    /**
     * Gets trial availability status
     */
    public async getTrialAvailability(): Promise<void> {
        try {
            const { value } = await window.API.Execute(new GetTrialAvailableDaysRequest());
            this.setIsTrialAvailable(value);
        } catch (err) {
            log.error('LicenseStore.getTrialAvailability failed', String(err));
        }
    }

    /**
     * Sets the trial availability status
     */
    public setIsTrialAvailable(value: number): void {
        this.trialAvailableDays = value;
    }
}
