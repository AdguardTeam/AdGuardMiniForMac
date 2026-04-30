// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import isNull from 'lodash/isNull';
import { makeAutoObservable } from 'mobx';

import { EnterActivationCodeRequest, GetLicenseRequest, GetSubscriptionsInfoRequest, GetTrialAvailableDaysRequest, RefreshLicenseRequest, RequestActivateRequest, RequestBindRequest, RequestLogoutRequest, RequestOpenAppStoreRequest, RequestOpenSubscriptionsRequest, RequestRenewRequest, RequestRestorePurchasesRequest, RequestSubscribeRequest } from 'Apis/requests/AccountService';
import { Subscription, LicenseStatus, AppStoreSubscription, WebActivateResult, LicenseOrError } from 'Apis/types';

import type { LicenseOrErrorExtended } from 'Apis/ExtendLicense';
import type { AppStoreSubscriptionsMessage } from 'Apis/types';
import type { SettingsStore } from 'SettingsStore';

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
 * Account store
 */
export class Account {
    /**
     * Stores the activation flow status
     */
    private activationFlowStatus: ActivationFlowStatus = {
        type: ActivationFlowStatusType.isCheckingLicenseStatus,
        value: false,
    };

    public rootStore: SettingsStore;

    /**
     * User License
     */
    public license = new LicenseOrError({ error: true }) as unknown as LicenseOrErrorExtended;

    /**
     * License update time, used for checking if the license is updated from callback
     */
    public licenseUpdateTime = Date.now();

    /**
     * AppStore subscriptions
     */
    public appStoreSubscriptions: AppStoreSubscriptionsMessage | null = null;

    /**
     * Indicates whether the paywall should be shown
     */
    public paywallShouldBeShown = false;

    /**
     * Trial availability status
     * Show available days for trial, if 0 - trial is not available
     */
    public trialAvailableDays = 0;
    /**
     * Checks if the license object is exist
     */
    public get hasLicense() {
        return this.license.has_license;
    }

    /**
     * Checks if the license is exist
     */
    public get isLicenseExist() {
        return this.hasLicense && Boolean(this.license.license?.licenseKey);
    }

    /**
     * Checks if subscriptions prices are loaded and available
     */
    public get subscriptionPricesAvailable() {
        return !isNull(this.appStoreSubscriptions);
    }

    /**
     * Checks if trial is expired
     */
    public get isTrialExpired() {
        return this.hasLicense && !this.isLicenseExist
            && this.license.license?.status === LicenseStatus.expired;
    }

    /**
     * Checks if license is expired
     */
    public get isLicenseExpired() {
        return this.hasLicense && this.isLicenseExist
            && this.license.license?.status === LicenseStatus.expired;
    }

    /**
     * Checks if the license status is active or trial
     */
    public get isLicenseOrTrialActive() {
        return this.isLicenseActive || this.isTrialActive;
    }

    /**
     * Checks if the license is active
     */
    public get isLicenseActive() {
        return this.hasLicense && this.license.license?.status === LicenseStatus.active;
    }

    /**
     * Checks if the trial is active
     */
    public get isTrialActive() {
        return this.hasLicense
            && this.license.license?.status === LicenseStatus.active
            && this.license.license?.licenseTrial;
    }

    /**
     * Checks if the license is trial
     */
    public get isTrial() {
        return this.hasLicense
            && this.license.license?.licenseTrial;
    }

    /**
     * Checks if the license status is blocked
     */
    public get isLicenseBlocked() {
        return this.hasLicense && this.license.license?.status === LicenseStatus.blocked;
    }

    /**
     * Checks if the license status is blocked app id
     */
    public get isLicenseBlockedAppId() {
        return this.hasLicense && this.license.license?.status === LicenseStatus.blocked_app_id;
    }

    /**
     * Checks if the trial is exist
     */
    public get isTrialExist() {
        return this.isLicenseExist
            && [LicenseStatus.trial, LicenseStatus.active, LicenseStatus.expired].includes(
                this.license.license!.status,
            ) && this.license.license?.licenseTrial;
    }

    /**
     * Checks if the application license status is free
     */
    public get isFreeware() {
        return this.hasLicense && this.license.license?.status === LicenseStatus.free;
    }

    /**
     * Checks if the App Store subscription exists
     */
    public get isAppStoreSubscription() {
        return this.hasLicense && !!this.license.license?.appStoreSubscription;
    }

    /**
     * Indicates that the license status is being checked right now
     */
    public get isCheckingLicenseStatus() {
        const { type, value } = this.activationFlowStatus;
        return type === ActivationFlowStatusType.isCheckingLicenseStatus && value;
    }

    /**
     * Indicates that an error has occured within the activation flow
     */
    public get hasActivationError() {
        const { type, value } = this.activationFlowStatus;
        return type === ActivationFlowStatusType.hasActivationError && value;
    }

    /**
     * Returns the activation flow result, if there is one
     */
    public get activationResult() {
        const { type, value } = this.activationFlowStatus;
        if (type === ActivationFlowStatusType.hasActivationResult) {
            return value;
        }
    }

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
     * Request subscription to AdGuard mini
     */
    private async requestSubscription(subscriptionType: Subscription) {
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
     * Receive user current license
     */
    public async getLicense() {
        this.getSubscriptionsInfo();
        this.getTrialAvailability();
        const resp = await window.API.Execute(new GetLicenseRequest());
        this.setLicense(resp as unknown as LicenseOrErrorExtended);
    }

    /**
     * Local setter for license
     */
    public setLicense(license: LicenseOrErrorExtended) {
        this.license = license;
        this.licenseUpdateTime = Date.now();
    }

    /**
     * Request to refresh the license
     */
    public async refreshLicense() {
        return window.API.Execute(new RefreshLicenseRequest());
    }

    /**
     * Request AppStore subscription
     */
    public async requestAppStoreSubscription(appStoreSubscription: AppStoreSubscription) {
        const subscription = appStoreSubscription === AppStoreSubscription.annual
            ? Subscription.annual
            : Subscription.monthly;

        this.requestSubscription(subscription);
    }

    /**
     * Request web subscription.
     * Redirects to AdGuard license purchase/trial activation page
     */
    public async requestWebSubscription(subscription?: Subscription.trial | Subscription.standalone) {
        if (subscription) {
            this.requestSubscription(subscription);
        } else {
            this.requestSubscription(this.trialAvailableDays > 0 ? Subscription.trial : Subscription.standalone);
        }
    }

    /**
     * Gets trial availability status
     */
    public async getTrialAvailability() {
        const { value } = await window.API.Execute(new GetTrialAvailableDaysRequest());
        this.setIsTrialAvailable(value);
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
    public async restorePurchase() {
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
     * Starts the activation flow and opens the activation page
     */
    public async requestLoginOrActivate() {
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
     * Request to open the bind page
     */
    public async requestBindLicense() {
        await window.API.Execute(new RequestBindRequest(
            { value: this.license.license?.licenseKey?.getHiddenValue() || '' },
        ));
    }

    /**
     * Request to open the renewal page
     */
    public requestRenewLicense(licenseKey: string) {
        window.API.Execute(new RequestRenewRequest({ value: licenseKey }));
    }

    /**
     * Request logout
     */
    public async requestLogout() {
        return window.API.Execute(new RequestLogoutRequest());
    }

    /**
     * Receive app store subscriptions info
     */
    public async getSubscriptionsInfo() {
        const result = await window.API.Execute(new GetSubscriptionsInfoRequest());

        this.setSubscriptionsInfo(result);
        return result;
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
     * Sets the trial availability status
     */
    public setIsTrialAvailable(value: number) {
        this.trialAvailableDays = value;
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
