// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useId } from 'preact/hooks';

import { formatLocalizedNumber } from 'Common/lib/number';
import { useDateFormat, DATE_FORMAT, useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { Loader, Text } from 'UILib';

import s from './FilteringRules.module.pcss';

/**
 * Filtering Rules component for System-wide Protection settings page
 */
function FilteringRulesComponent() {
    const { advancedBlocking, settings } = useSettingsStore();
    const {
        urlFilterInfo,
        urlFilterState: { info },
    } = advancedBlocking;
    const {
        language,
    } = settings.settings;

    const formatDate = useDateFormat();

    // Each row is a label in one column and its value in another. Read
    // separately they arrive as loose fragments — "Rules", then a bare number —
    // so each row is grouped into a single announcement.
    const rulesLabelId = useId();
    const rulesValueId = useId();
    const updateLabelId = useId();
    const updateDescId = useId();
    const updateValueId = useId();

    // Do not render the component
    // if there are no rules and no last update timestamp
    if (!(info.rulesCount > 0 || info.lastUpdate > 0)) {
        return null;
    }

    return (
        <div className={s.FilteringRules_block}>
            <Text className={cx(s.FilteringRules_block_title, theme.layout.content)} type="h5">
                {translate('advanced.blocking.system.wide.part.filtering')}
            </Text>
            <div className={s.FilteringRules_block_row}>
                <Text
                    ariaLabelledby={`${rulesLabelId} ${rulesValueId}`}
                    className={cx(s.FilteringRules_block_col__stretched, s.FilteringRules_block_col__rule)}
                    id={rulesLabelId}
                    tabIndex={0}
                    type="t1"
                >
                    {translate('advanced.blocking.system.wide.part.filtering.rules')}
                </Text>
                {urlFilterInfo
                    ? (
                        <Text className={cx(s.FilteringRules_block_col, s.FilteringRules_block_col__rule)} id={rulesValueId} type="t1">
                            {formatLocalizedNumber(urlFilterInfo.rulesCount, language)}
                        </Text>
                    )
                    : (<Loader />)}
            </div>
            <div className={s.FilteringRules_block_row}>
                <div className={s.FilteringRules_block_col__stretched}>
                    <Text
                        ariaLabelledby={`${updateLabelId} ${updateDescId} ${updateValueId}`}
                        id={updateLabelId}
                        tabIndex={0}
                        type="t1"
                    >
                        {translate('advanced.blocking.system.wide.part.filtering.last.update')}
                    </Text>
                    <Text className={s.FilteringRules_block_desc} id={updateDescId} type="t2">
                        {translate('advanced.blocking.system.wide.part.filtering.last.update.desc')}
                    </Text>
                </div>
                {urlFilterInfo
                    ? (
                        <Text className={cx(s.FilteringRules_block_col, s.FilteringRules_block_col__rule)} id={updateValueId} type="t1">
                            {formatDate(urlFilterInfo.lastUpdate * 1000, DATE_FORMAT.hours_minutes_day_month_year)}
                        </Text>
                    )
                    : (<Loader />)}
            </div>
        </div>
    );
}

export const FilteringRules = observer(FilteringRulesComponent);
