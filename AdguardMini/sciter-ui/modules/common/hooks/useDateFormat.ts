// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useMemo } from 'preact/hooks';

import { DATE_FORMAT, getDateString } from 'Common/lib/date';

/**
 * Shared hook returning a locale-aware date formatter.
 *
 * @param language — the current language locale string (e.g. "enUS")
 */
export function useDateFormat(language: string | undefined) {
    const locale = language || 'enUS';

    return useMemo(() => {
        return (date: string | number, format: DATE_FORMAT) => getDateString(date, format, locale);
    }, [locale]);
}

export { DATE_FORMAT };
