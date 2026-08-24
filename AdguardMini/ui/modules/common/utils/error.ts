// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { isObjectNonNull, isString } from '@adg/webview-utils-kit';

/**
 * Try to get error message from unknown object
 *
 * @param error
 * @param defaultMessage
 */
export function getErrorMessage(error: Error | unknown, defaultMessage: string): string {
    if (isObjectNonNull(error) && isString(error.message)) {
        return error.message;
    }

    return defaultMessage;
}
