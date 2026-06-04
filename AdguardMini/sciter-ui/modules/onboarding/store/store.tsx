// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

// NOTE: Constructor DI waiver — sub-stores receive the root store
// (e.g., `new Steps(this)`) rather than individual dependency injection.
// This is an intentional architectural tradeoff documented in AGENTS.md §V.1.
// The alternative (passing only specific sub-store references per constructor)
// was evaluated but rejected to avoid cascading parameter changes when the
// dependency graph evolves.

import { createContext } from 'preact';

import { GetEffectiveThemeRequest } from 'Apis/requests/OnboardingService';
import { LicenseStore, SafariExtensionsStore } from 'Common/stores';
import { Action } from 'Modules/common/utils/EventAction';

import {
    type OnboardingRouterStore,
    Steps,
    onboardingRouterFactory,
    onboardingTelemetryFactory,
    type OnboardingTelemetry,
} from './modules';

import type { EffectiveTheme } from 'Apis/types';

/**
 * Onboarding app store
 */
export class OnboardingStore {
    public steps: Steps;

    /**
     * Onboarding router instance
     */
    public router: OnboardingRouterStore;

    /**
     * Onboarding telemetry instance
     */
    public readonly telemetry: OnboardingTelemetry;

    /**
     * Onboarding window effective theme changed event
     */
    public readonly onboardingWindowEffectiveThemeChanged = new Action<EffectiveTheme>();

    /**
     * Safari extensions store (shared, exposed for access)
     */
    public readonly safariExtensions: SafariExtensionsStore;

    /**
     * License store (shared, exposed for access)
     */
    public readonly licenseStore: LicenseStore;

    /**
     * Ctor
     */
    constructor() {
        this.safariExtensions = new SafariExtensionsStore();
        this.licenseStore = new LicenseStore();

        this.steps = new Steps();
        this.router = onboardingRouterFactory();
        this.telemetry = onboardingTelemetryFactory();

        this.safariExtensions.getSafariExtensions();
        this.getEffectiveTheme();
    }

    /**
     * Get effective theme
     */
    public async getEffectiveTheme(): Promise<EffectiveTheme> {
        const { value } = await window.API.Execute(new GetEffectiveThemeRequest());
        return value;
    }
}

export const store = new OnboardingStore();
const StoreContext = createContext<OnboardingStore>(store);
export default StoreContext;
