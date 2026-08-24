// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Telemetry from 'Modules/common/stores/Telemetry';

/**
 * Onboarding-specific layers
 */
export enum OnboardingLayer {
    EulaScreen = 'eula_screen',
    ExtensionsScreen = 'extensions_screen',
    OnboardingScreen = 'onboarding_screen',
    BlockTrackersScreen = 'block_trackers_screen',
    BlockAnnoyancesOnboarding = 'block_annoyances_onboarding',
    AllSetScreen = 'all_set_screen',
}

/**
 * Onboarding-specific events
 */
export enum OnboardingEvents {
    BlockTrackersYesClick = 'block_trackers_yes_click',
    BlockAnnoyancesYesClick = 'block_annoyances_yes_click',
    TuneTheAppClick = 'tune_the_app_click',
}

/**
 * Type for onboarding telemetry instance
 */
export type OnboardingTelemetry = Telemetry<never, OnboardingEvents, OnboardingLayer>;

/**
 * Creates and returns a new onboarding telemetry instance
 */
export function onboardingTelemetryFactory(): OnboardingTelemetry {
    return new Telemetry<never, OnboardingEvents, OnboardingLayer>();
}
