// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Theme } from 'Apis/types';
import { useTheme as useCommonTheme } from 'Common/hooks/useTheme';
import { useOnboardingStore } from 'OnboardingLib/hooks';

import type { OnColorThemeChanged } from 'Utils/colorThemes';

/**
 * Onboarding-specific theme hook adapter.
 */
export function useTheme(onThemeChanged: OnColorThemeChanged) {
    const store = useOnboardingStore();

    useCommonTheme(onThemeChanged, {
        theme: Theme.system,
        getEffectiveTheme: async () => store.getEffectiveTheme(),
        effectiveThemeChangedEvent: store.onboardingWindowEffectiveThemeChanged,
    });
}
