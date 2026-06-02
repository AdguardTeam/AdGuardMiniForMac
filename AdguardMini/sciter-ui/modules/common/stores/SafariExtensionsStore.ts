// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { SafariExtensions, SafariExtension, SafariExtensionStatus, SafariExtensionType } from 'Apis/types';

import type { SafariExtensionUpdate } from 'Apis/types';

/**
 * Store for managing Safari extensions state.
 * Provides computed properties and actions for Safari extension management.
 */
export class SafariExtensionsStore {
    /**
     * Stores the last non-loading state for each extension key.
     * Used to prevent health check card flickering during filter conversion.
     */
    private readonly previousStates = new Map<string, {
        status: SafariExtensionStatus;
        isConsideredEnabled: boolean;
    }>();

    public safariExtensions = new SafariExtensions();

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
     * Returns extensions list with loading statuses replaced by their last
     * known non-loading status. If no previous status exists (initial load),
     * the loading status is preserved. Used by health check card logic to
     * prevent flickering.
     */
    public get effectiveExtensionsList(): SafariExtension[] {
        return this.extensionsList.map((ext) => {
            if (ext.status !== SafariExtensionStatus.loading) {
                return ext;
            }
            const cached = this.previousStates.get(ext.id);
            if (cached === undefined) {
                return ext;
            }
            return new SafariExtension({
                id: ext.id,
                rulesEnabled: ext.rulesEnabled,
                rulesTotal: ext.rulesTotal,
                status: cached.status,
                isConsideredEnabled: cached.isConsideredEnabled,
            });
        });
    }

    /**
     * Whether all extensions are effectively enabled, using cached statuses
     * for extensions currently in loading state. Prevents hasExtensionsDisabled
     * from flickering during filter conversion.
     */
    public get allExtensionsEffectivelyEnabled(): boolean {
        return this.effectiveExtensionsList.every((ext) => ext.isConsideredEnabled);
    }

    /**
     * Ctor
     */
    constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
    }

    /**
     * Set safari protection status.
     * Updates the previous statuses cache for extensions transitioning
     * away from loading state.
     */
    public setSafariExtensions(data: SafariExtensions): void {
        const extensions = Object.values(data.toObject());

        for (const ext of extensions) {
            if (ext && ext.status !== SafariExtensionStatus.loading) {
                this.previousStates.set(ext.id!, {
                    status: ext.status!,
                    isConsideredEnabled: ext.isConsideredEnabled!,
                });
            }
        }

        this.safariExtensions = data;
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
}
