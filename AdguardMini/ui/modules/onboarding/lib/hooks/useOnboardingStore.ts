// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useContext } from 'preact/compat';

import OnboardingStore from 'OnboardingStore';

/**
 * Hook for onboarding store
 */
export function useOnboardingStore() {
    return useContext(OnboardingStore);
}
