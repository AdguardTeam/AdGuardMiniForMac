// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

export { DATE_FORMAT } from 'Common/hooks/useDateFormat';

import { useDateFormat as useCommonDateFormat } from 'Common/hooks/useDateFormat';

import { useSettingsStore } from './useSettingsStore';

const useDateFormat = () => {
    const { settings: { settings } } = useSettingsStore();
    return useCommonDateFormat(settings?.language);
};

export { useDateFormat };
