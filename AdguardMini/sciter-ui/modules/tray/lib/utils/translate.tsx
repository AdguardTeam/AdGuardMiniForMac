// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createProvideContactSupportParam } from 'Common/utils/translate';
import { ContactSupportLink } from 'Modules/tray/components/ContactSupportLink';

/**
 * Provides a contactSupport parameter for use with the translate lib's messages
 */
export const provideContactSupportParam = (
    createProvideContactSupportParam(ContactSupportLink)
);
