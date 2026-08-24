// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { RouterStore } from 'Modules/common/stores/RouterStore';

/**
 * Onboarding application routes
 */
export enum RouteName {
    onboarding = 'onboarding',
}

/**
 * Onboarding router store type
 * Extends the base RouterStore with Onboarding-specific route types
 */
export type OnboardingRouterStore = RouterStore<RouteName>;

/**
 * Creates and returns an onboarding router store
 *
 * @returns A new OnboardingRouterStore instance for onboarding navigation
 */
export function onboardingRouterFactory(): OnboardingRouterStore {
    return new RouterStore(RouteName.onboarding);
}
