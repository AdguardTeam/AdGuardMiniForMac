// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Provides a trialDays parameter for use with the translate lib's messages
 */
export const provideTrialDaysParam = (availableDays: number) => ({
    trialDays: availableDays,
});

/**
 * Returns the BCP 47 tag of the language the UI is translated into, for the
 * `Intl` formats that spell numbers, units and dates.
 */
export function getUILanguageTag(): string {
    return document.documentElement.lang || 'en';
}
