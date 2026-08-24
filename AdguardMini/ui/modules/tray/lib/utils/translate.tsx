// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { ContactSupportLink } from 'Modules/tray/components/ContactSupportLink';

import type { ContactSupportLinkProps } from 'Modules/tray/components/ContactSupportLink';

/**
 * Provides a contactSupport parameter for use with the translate lib's messages
 */
export const provideContactSupportParam = (props?: Omit<ContactSupportLinkProps, 'text'>) => ({
    contactSupport: (text: string) => (
        <ContactSupportLink text={text} {...props} />
    ),
});
