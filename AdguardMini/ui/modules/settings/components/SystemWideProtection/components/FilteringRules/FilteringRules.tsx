// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { formatLocalizedNumber } from 'Common/lib/number';
import { useDateFormat, DATE_FORMAT, useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { Text } from 'UILib';

import s from './FilteringRules.module.pcss';

/**
 * Filtering Rules component for System-wide Protection settings page
 */
function FilteringRulesComponent() {
    const { advancedBlocking, settings } = useSettingsStore();
    const {
        rulesCount,
        lastUpdate,
    } = advancedBlocking.urlFilterState.info;
    const {
        language,
    } = settings.settings;

    const formatDate = useDateFormat();

    // Do not render the component
    // if there are no rules and no last update timestamp
    if (!(rulesCount > 0 || lastUpdate > 0)) {
        return null;
    }

    const rulesCountFormatted = formatLocalizedNumber(rulesCount, language);

    const lastUpdateDateFormatted = formatDate(lastUpdate * 1000, DATE_FORMAT.hours_minutes_day_month_year);

    return (
        <div className={s.FilteringRules_block}>
            <Text className={cx(s.FilteringRules_block_title, theme.layout.content)} type="h5">
                {translate('advanced.blocking.system.wide.part.filtering')}
            </Text>
            <div className={s.FilteringRules_block_row}>
                <Text className={s.FilteringRules_block_col__stretched} type="t1">
                    {translate('advanced.blocking.system.wide.part.filtering.rules')}
                </Text>
                <Text className={s.FilteringRules_block_col} type="t1">
                    {rulesCountFormatted}
                </Text>
            </div>
            <div className={s.FilteringRules_block_row}>
                <div className={s.FilteringRules_block_col__stretched}>
                    <Text type="t1">
                        {translate('advanced.blocking.system.wide.part.filtering.last.update')}
                    </Text>
                    <Text className={s.FilteringRules_block_desc} type="t2">
                        {translate('advanced.blocking.system.wide.part.filtering.last.update.desc')}
                    </Text>
                </div>
                <Text className={s.FilteringRules_block_col} type="t1">
                    {lastUpdateDateFormatted}
                </Text>
            </div>
        </div>
    );
}

export const FilteringRules = observer(FilteringRulesComponent);
