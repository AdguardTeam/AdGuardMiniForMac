// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createContext } from 'preact';

import { GetEffectiveThemeRequest } from 'Apis/requests/OnboardingService';
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
     * Ctor
     */
    constructor() {
        this.steps = new Steps(this);
        this.router = onboardingRouterFactory();
        this.telemetry = onboardingTelemetryFactory();
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
