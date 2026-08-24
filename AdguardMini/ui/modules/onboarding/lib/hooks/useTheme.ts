// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useLayoutEffect } from 'preact/hooks';

import { useOnboardingStore } from 'OnboardingLib/hooks';
import { getColorTheme } from 'Utils/colorThemes';

import type { OnColorThemeChanged } from 'Utils/colorThemes';

/**
 * Sets theme for onboarding window
 */
export function useTheme(onThemeChanged: OnColorThemeChanged) {
    const onboardingStore = useOnboardingStore();
    const { effectiveTheme } = onboardingStore.steps;

    useLayoutEffect(() => {
        if (effectiveTheme !== null) {
            onThemeChanged(getColorTheme(effectiveTheme));
        }
    }, [effectiveTheme]);
}
