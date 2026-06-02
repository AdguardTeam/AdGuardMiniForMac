// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { ComponentType, ComponentProps } from 'preact';

/**
 * Provides a trialDays parameter for use with the translate lib's messages
 */
export const provideTrialDaysParam = (availableDays: number) => ({
    trialDays: availableDays,
});

interface ContactSupportLinkLikeProps {
    text: string;
    [key: string]: unknown;
}

/**
 * Factory that creates a `provideContactSupportParam` for a module,
 * using the module's specific ContactSupportLink component.
 *
 * @param ContactSupportLink — the module's ContactSupportLink component
 */
export function createProvideContactSupportParam(
    ContactSupportLink: ComponentType<ContactSupportLinkLikeProps>,
) {
    return (props?: Record<string, unknown>) => ({
        contactSupport: (text: string) => (
            <ContactSupportLink text={text} {...props} />
        ),
    });
}
