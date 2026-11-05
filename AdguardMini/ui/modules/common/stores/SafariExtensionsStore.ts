// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { SafariExtensions, SafariExtension, SafariExtensionStatus, SafariExtensionType } from 'Apis/types';

import type { SafariExtensionUpdate } from 'Apis/types';

/**
 * How long a pushed extension list must stay unchanged before the health check
 * adopts it.
 *
 * The platform reports the extensions one by one at the end of a reload, so a
 * filter update rewrites the list in parts; a list that survives this window
 * is treated as settled.
 */
export const SAFARI_EXTENSIONS_SETTLE_MS = 3000;

/**
 * Store for managing Safari extensions state.
 * Provides computed properties and actions for Safari extension management.
 */
export class SafariExtensionsStore {
    /**
     * Extension list shown to the health check: the last list that stayed
     * unchanged for the settle window.
     */
    private settledExtensions: SafariExtension[] | null = null;

    /**
     * Extension list waiting for the settle window to elapse.
     */
    private pendingExtensions: SafariExtension[] | null = null;

    /**
     * Timer that adopts the pending list once it has stayed stable.
     */
    private settleTimer: ReturnType<typeof setTimeout> | null = null;

    public safariExtensions = new SafariExtensions();

    /**
     * Whether the extension list has been received from the platform.
     */
    public isLoaded = false;

    /**
     * Get list of all Safari extensions by dynamically iterating over protobuf getters.
     * Uses property descriptors to avoid manual enumeration.
     * Computed getter for MobX caching.
     */
    private get extensionsList(): SafariExtension[] {
        const descriptors = Object.getOwnPropertyDescriptors(
            Object.getPrototypeOf(this.safariExtensions),
        );

        return Object.entries(descriptors)
            .filter(([, desc]) => typeof desc.get === 'function')
            .map(([key]) => this.safariExtensions[key as keyof SafariExtensions])
            .filter((value): value is SafariExtension => value instanceof SafariExtension);
    }

    /**
     * Whether all safari extensions are enabled.
     * Computed from individual isConsideredEnabled flags set by Swift.
     */
    public get allExtensionsEnabled(): boolean {
        return this.extensionsList.every((ext) => ext.isConsideredEnabled);
    }

    /**
     * Get count of safari extensions.
     */
    public get safariExtensionsCount(): number {
        return this.extensionsList.length;
    }

    /**
     * Get count of enabled safari extensions.
     * Uses isConsideredEnabled flag computed by Swift.
     */
    public get enabledSafariExtensionsCount(): number {
        return this.extensionsList.filter((ext) => ext.isConsideredEnabled).length;
    }

    /**
     * Getter for safari extensions with loading status.
     */
    public get safariExtensionsLoading(): boolean {
        return this.extensionsList.some((ext) => ext.status === SafariExtensionStatus.loading);
    }

    /**
     * Returns the extension list the health check derives its warnings from.
     *
     * While the platform rewrites statuses (a conversion or reload is running)
     * the last settled list is returned, so the warning cards do not appear and
     * disappear with every pushed status.
     */
    public get effectiveExtensionsList(): SafariExtension[] {
        return this.settledExtensions ?? this.extensionsList;
    }

    /**
     * Whether all extensions are effectively enabled, using the settled list
     * so hasExtensionsDisabled does not flicker during filter conversion.
     */
    public get allExtensionsEffectivelyEnabled(): boolean {
        return this.effectiveExtensionsList.every((ext) => ext.isConsideredEnabled);
    }

    /**
     * Ctor
     */
    constructor() {
        makeAutoObservable(this);
    }

    /**
     * Marks the extension list as received from the platform.
     */
    public markLoaded(): void {
        this.isLoaded = true;
    }

    /**
     * Set safari protection status.
     * Adopts the pushed list only after it has stayed unchanged for the settle
     * window; the first list is shown immediately because the health check
     * waits for it before rendering.
     */
    public setSafariExtensions(data: SafariExtensions): void {
        this.safariExtensions = data;

        const extensions = this.extensionsList;

        if (this.settledExtensions === null) {
            this.settledExtensions = extensions;
            return;
        }

        // Any extension still loading means the cycle is still rewriting the list, push by push.
        if (extensions.some((ext) => ext.status === SafariExtensionStatus.loading)) {
            this.cancelPendingExtensions();
            return;
        }

        if (this.isSameStatusList(extensions, this.settledExtensions)) {
            this.cancelPendingExtensions();
            return;
        }

        if (this.pendingExtensions !== null && this.isSameStatusList(extensions, this.pendingExtensions)) {
            // Repeated final pushes must not restart the running settle window.
            return;
        }

        this.pendingExtensions = extensions;
        if (this.settleTimer !== null) {
            clearTimeout(this.settleTimer);
        }
        this.settleTimer = setTimeout(() => {
            this.settleTimer = null;
            this.adoptPendingExtensions();
        }, SAFARI_EXTENSIONS_SETTLE_MS);
    }

    /**
     * Updates safari extension.
     */
    public updateSafariExtension(data: SafariExtensionUpdate): void {
        const newState = new SafariExtensions();
        newState.adguardForSafari = this.safariExtensions.adguardForSafari;
        newState.custom = this.safariExtensions.custom;
        newState.general = this.safariExtensions.general;
        newState.other = this.safariExtensions.other;
        newState.privacy = this.safariExtensions.privacy;
        newState.security = this.safariExtensions.security;
        newState.social = this.safariExtensions.social;

        switch (data.type) {
            case SafariExtensionType.adguard_for_safari:
                newState.adguardForSafari = data.state;
                break;
            case SafariExtensionType.custom:
                newState.custom = data.state;
                break;
            case SafariExtensionType.general:
                newState.general = data.state;
                break;
            case SafariExtensionType.other:
                newState.other = data.state;
                break;
            case SafariExtensionType.privacy:
                newState.privacy = data.state;
                break;
            case SafariExtensionType.security:
                newState.security = data.state;
                break;
            case SafariExtensionType.social:
                newState.social = data.state;
                break;
        }

        this.setSafariExtensions(newState);
    }

    /**
     * Whether two lists carry the same health-check statuses.
     */
    private isSameStatusList(left: SafariExtension[], right: SafariExtension[]): boolean {
        return left.length === right.length && left.every((extension, index) => {
            const other = right[index];

            return other !== undefined
                && extension.id === other.id
                && extension.status === other.status
                && extension.isConsideredEnabled === other.isConsideredEnabled;
        });
    }

    /**
     * Drops the pending list and its settle timer, if any.
     */
    private cancelPendingExtensions(): void {
        this.pendingExtensions = null;
        if (this.settleTimer !== null) {
            clearTimeout(this.settleTimer);
            this.settleTimer = null;
        }
    }

    /**
     * Shows the pending list and drops it.
     */
    private adoptPendingExtensions(): void {
        const pending = this.pendingExtensions;
        this.pendingExtensions = null;
        if (pending !== null) {
            this.settledExtensions = pending;
        }
    }
}
