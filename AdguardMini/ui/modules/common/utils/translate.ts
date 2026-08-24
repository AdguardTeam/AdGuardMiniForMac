// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Provides a trialDays parameter for use with the translate lib's messages
 */
export const provideTrialDaysParam = (availableDays: number) => ({
    trialDays: availableDays,
});
