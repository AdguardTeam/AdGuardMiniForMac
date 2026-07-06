// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Account.ts
//  AdguardMini
//

import isNull from 'lodash/isNull';
import { makeAutoObservable } from 'mobx';

import { EnterActivationCodeRequest, GetSubscriptionsInfoRequest, RefreshLicenseRequest, RequestActivateRequest, RequestBindRequest, RequestLogoutRequest, RequestOpenAppStoreRequest, RequestOpenSubscriptionsRequest, RequestRenewRequest, RequestRestorePurchasesRequest, RequestSubscribeRequest } from 'Apis/requests/AccountService';
import { AppStoreSubscription, Subscription, WebActivateResult } from 'Apis/types';

import type { LicenseExtended } from 'Apis/ExtendLicense';
import type { AppStoreSubscriptionsMessage } from 'Apis/types';
import type { LicenseStore } from 'Common/stores/LicenseStore';

/**
 * Enum representing the result of the activation flow
 */
export enum ActivationFlowResult {
    // Trial has started
    trialSuccess = 'trialSuccess',
    // Full version activated
    licenseSuccess = 'licenseSuccess',
    // Failed to activate full version
    licenseFailure = 'licenseFailure',
    // No purchases to restore
    restoreFailure = 'restoreFailure',
}

/**
 * Enum representing the type of activation flow status
 */
export enum ActivationFlowStatusType {
    hasActivationError = 'hasActivationError',
    isCheckingLicenseStatus = 'isCheckingLicenseStatus',
    hasActivationResult = 'hasActivationResult',
}

/**
 * Representing different activation flow statuses
 */
type ActivationFlowStatus
    = | {
        type: ActivationFlowStatusType.hasActivationError;
        value: boolean;
    }
    | {
        type: ActivationFlowStatusType.isCheckingLicenseStatus;
        value: boolean;
    }
    | {
        type: ActivationFlowStatusType.hasActivationResult;
        value: ActivationFlowResult;
    };

/**
 * Account store — manages activation flow, subscriptions, and paywall state.
 * Delegates license CRUD and status computed properties to LicenseStore.
 */
export class Account {
    /**
     * Stores the activation flow status
     */
    private activationFlowStatus: ActivationFlowStatus = {
        type: ActivationFlowStatusType.isCheckingLicenseStatus,
        value: false,
    };

    // This should be private but due to MobX typings we make it public or we have error in makeAutoObservable
    public readonly licenseStore: LicenseStore;

    /**
     * AppStore subscriptions
     */
    public appStoreSubscriptions: AppStoreSubscriptionsMessage | null = null;

    /**
     * Indicates whether the paywall should be shown
     */
    public paywallShouldBeShown = false;

    /**
     * License update time, used for checking if the license is updated from callback
     */
    public licenseUpdateTime = Date.now();

    /**
     * Checks if subscriptions prices are loaded and available
     */
    public get subscriptionPricesAvailable(): boolean {
        return !isNull(this.appStoreSubscriptions);
    }

    // -- Delegated license computed properties --

    /** Delegated to LicenseStore */
    public get hasLicense(): boolean {
        return this.licenseStore.hasLicense;
    }

    /** Delegated to LicenseStore */
    public get isLicenseExist(): boolean {
        return this.licenseStore.isLicenseExist;
    }

    /** Delegated to LicenseStore */
    public get isTrialExpired(): boolean {
        return this.licenseStore.isTrialExpired;
    }

    /** Delegated to LicenseStore */
    public get isLicenseExpired(): boolean {
        return this.licenseStore.isLicenseExpired;
    }

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
    public get isTrial(): boolean {
        return this.licenseStore.isTrial;
    }

    /** Delegated to LicenseStore */
    public get isLicenseBlocked(): boolean {
        return this.licenseStore.isLicenseBlocked;
    }

    /** Delegated to LicenseStore */
    public get isLicenseBlockedAppId(): boolean {
        return this.licenseStore.isLicenseBlockedAppId;
    }

    /** Delegated to LicenseStore */
    public get isTrialExist(): boolean {
        return this.licenseStore.isTrialExist;
    }

    /** Delegated to LicenseStore */
    public get isFreeware(): boolean {
        return this.licenseStore.isFreeware;
    }

    /** Delegated to LicenseStore */
    public get isAppStoreSubscription(): boolean {
        return this.licenseStore.isAppStoreSubscription;
    }

    /** Delegated to LicenseStore */
    public get trialAvailableDays(): number {
        return this.licenseStore.trialAvailableDays;
    }

    // -- Activation flow computed --

    /**
     * Indicates that the license status is being checked right now
     */
    public get isCheckingLicenseStatus(): boolean {
        const { type, value } = this.activationFlowStatus;
        return type === ActivationFlowStatusType.isCheckingLicenseStatus && value;
    }

    /**
     * Indicates that an error has occured within the activation flow
     */
    public get hasActivationError(): boolean {
        const { type, value } = this.activationFlowStatus;
        return type === ActivationFlowStatusType.hasActivationError && value;
    }

    /**
     * Returns the activation flow result, if there is one
     */
    public get activationResult(): ActivationFlowResult | undefined {
        const { type, value } = this.activationFlowStatus;
        if (type === ActivationFlowStatusType.hasActivationResult) {
            return value;
        }
    }

    /**
     * Return license info (delegates to LicenseStore)
     */
    public get license(): LicenseExtended | null {
        return this.licenseStore.license.license ?? null;
    }

    /**
     * Ctor
     *
     * @param licenseStore Shared license store
     */
    public constructor(licenseStore: LicenseStore) {
        this.licenseStore = licenseStore;
        makeAutoObservable(this, {
            licenseStore: false,
        }, { autoBind: true });
    }

    /**
     * Request subscription to AdGuard mini
     */
    private async requestSubscription(subscriptionType: Subscription): Promise<void> {
        this.updateActivationFlowStatus({
            type: ActivationFlowStatusType.isCheckingLicenseStatus,
            value: true,
        });

        const { hasError } = await window.API.Execute(new RequestSubscribeRequest({ subscriptionType }));

        if (hasError) {
            this.updateActivationFlowStatus({
                type: ActivationFlowStatusType.hasActivationError,
                value: true,
            });
        }
    }

    /**
     * Updates the activation flow status
     */
    private updateActivationFlowStatus(status: typeof this.activationFlowStatus) {
        this.activationFlowStatus = status;
    }

    /**
     * Receive user current license (delegates to LicenseStore)
     */
    public async getLicense(): Promise<void> {
        try {
            this.getSubscriptionsInfo();
            this.licenseStore.getTrialAvailability();
            await this.licenseStore.getLicense();
            this.licenseUpdateTime = Date.now();
        } catch (err) {
            log.error('Account.getLicense failed', String(err));
        }
    }

    /**
     * Request AppStore subscription
     */
    public async requestAppStoreSubscription(appStoreSubscription: AppStoreSubscription): Promise<void> {
        const subscription = appStoreSubscription === AppStoreSubscription.annual
            ? Subscription.annual
            : Subscription.monthly;

        this.requestSubscription(subscription);
    }

    /**
     * Request web subscription.
     * Redirects to AdGuard license purchase/trial activation page
     */
    public async requestWebSubscription(subscription?: Subscription.trial | Subscription.standalone): Promise<void> {
        if (subscription) {
            this.requestSubscription(subscription);
        } else {
            this.requestSubscription(this.trialAvailableDays > 0 ? Subscription.trial : Subscription.standalone);
        }
    }

    /**
     * Activates the license by the activation code
     */
    public async activateLicenseByCode(activationCode: string) {
        const response = await window.API.Execute(new EnterActivationCodeRequest({ value: activationCode }));

        const { error: { hasError } } = response;

        if (hasError) {
            this.updateActivationFlowStatus({
                type: ActivationFlowStatusType.hasActivationError,
                value: true,
            });
        }

        return response;
    }

    /**
     * Restore purchase to AdGuard mini
     */
    public async restorePurchase(): Promise<void> {
        this.updateActivationFlowStatus({
            type: ActivationFlowStatusType.isCheckingLicenseStatus,
            value: true,
        });

        const { hasError } = await window.API.Execute(new RequestRestorePurchasesRequest());

        if (hasError) {
            this.setActivationFlowResult(ActivationFlowResult.restoreFailure);
        }
    }

    /**
     * Request to refresh the license
     */
    public async refreshLicense() {
        return window.API.Execute(new RefreshLicenseRequest());
    }

    /**
     * Starts the activation flow and opens the activation page
     */
    public async requestLoginOrActivate(): Promise<void> {
        this.updateActivationFlowStatus({
            type: ActivationFlowStatusType.isCheckingLicenseStatus,
            value: true,
        });
        const { result } = await window.API.Execute(new RequestActivateRequest());
        if (result === WebActivateResult.cancelled) {
            this.resetActivationFlowStatus();
        }
    }

    /**
     * Request logout
     */
    public async requestLogout() {
        return window.API.Execute(new RequestLogoutRequest());
    }

    /**
     * Request to open the bind page
     */
    public async requestBindLicense() {
        return window.API.Execute(new RequestBindRequest(
            { value: this.license?.licenseKey?.getHiddenValue() || '' },
        ));
    }

    /**
     * Request to open the renewal page
     */
    public requestRenewLicense(licenseKey: string) {
        window.API.Execute(new RequestRenewRequest({ value: licenseKey }));
    }

    /**
     * Receive app store subscriptions info
     */
    public async getSubscriptionsInfo(): Promise<AppStoreSubscriptionsMessage | undefined> {
        try {
            const result = await window.API.Execute(new GetSubscriptionsInfoRequest());
            this.setSubscriptionsInfo(result);
            return result;
        } catch (err) {
            log.error('Account.getSubscriptionsInfo failed', String(err));
            return undefined;
        }
    }

    /**
     * Local setter for appStoreSubscriptions
     */
    public setSubscriptionsInfo(appStoreSubscriptions: typeof this.appStoreSubscriptions) {
        this.appStoreSubscriptions = appStoreSubscriptions;
    }

    /**
     * Shows the paywall
     */
    public showPaywall() {
        this.paywallShouldBeShown = true;
    }

    /**
     * Closes the paywall
     */
    public closePaywall() {
        this.paywallShouldBeShown = false;
    }

    /**
     * Resets the activation flow status to initial value
     */
    public resetActivationFlowStatus() {
        this.activationFlowStatus = {
            type: ActivationFlowStatusType.isCheckingLicenseStatus,
            value: false,
        };
    }

    /**
     * Sets the activation flow result
     */
    public setActivationFlowResult(value: ActivationFlowResult) {
        this.activationFlowStatus = {
            type: ActivationFlowStatusType.hasActivationResult,
            value,
        };
    }

    /**
     * Request to open the subscriptions page
     */
    public async requestOpenSubscriptions() {
        return window.API.Execute(new RequestOpenSubscriptionsRequest());
    }

    /**
     * Request to open the app store page
     */
    public async requestOpenAppStore() {
        return window.API.Execute(new RequestOpenAppStoreRequest());
    }
}
