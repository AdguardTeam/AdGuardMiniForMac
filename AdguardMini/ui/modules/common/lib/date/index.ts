// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { format } from 'date-fns';
import * as Locales from 'date-fns/locale';

export enum DATE_FORMAT {
    day_month = 'dd MMMM',
    day_month_year = 'dd MMM yyy',
    day_month_hours_minutes = 'dd MMMM, HH:mm',
    hours_minutes_day_month_year = 'dd MMM yyyy, HH:mm',
}

/**
 * Get formatted date string
 */
export function getDateString(date: string | number, pattern: DATE_FORMAT, languageCode: string) {
    let codeFull = '';
    let code = '';

    if (languageCode.includes('-')) {
        const temp = languageCode.split('-');
        [code] = temp;
        codeFull = `${code}${temp[1].toUpperCase()}`;
    }
    const locale = (Locales as Record<string, Locales.Locale>)[code]
        || (Locales as Record<string, Locales.Locale>)[codeFull]
        // Last chance to find locale, Locales from date-fns is object with key - mostly first 2 letters of locale
        // Need to rework it
        || (Locales as Record<string, Locales.Locale>)[languageCode.substring(0, 2)]
        || Locales.enUS;

    return format(date, pattern, { locale });
}
