// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

export { DATE_FORMAT } from 'Common/hooks/useDateFormat';

import { useDateFormat as useCommonDateFormat } from 'Common/hooks/useDateFormat';

import { useTrayStore } from './useTrayStore';

const useDateFormat = () => {
    const { traySettings: { settings } } = useTrayStore();
    return useCommonDateFormat(settings?.language);
};

export { useDateFormat };
