// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { DATE_FORMAT, getDateString } from 'Common/lib/date';

import { useTrayStore } from './useTrayStore';

const useDateFormat = () => {
    const { settings: { settings } } = useTrayStore();
    const locale = settings?.language || 'enUS';

    return (date: string | number, format: DATE_FORMAT) => getDateString(date, format, locale);
};

export { DATE_FORMAT, useDateFormat };
