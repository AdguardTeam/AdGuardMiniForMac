// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';

import { SettingsItemLink } from '../../../SettingsItem';

import s from './FilterGroup.module.pcss';

import type { IconType } from 'UILib';

export type FilterGroupProps = {
    groupId: number;
    onClick(): void;
};

/**
 * FilterGroup line for showing filter group
 */
function FilterGroupComponent({
    groupId,
    onClick,
}: FilterGroupProps) {
    const {
        filters: {
            filtersByGroups,
            enabledFilters,
            filters: { customFilters },
            filtersIndex: { groups, customGroupId },
        },
    } = useSettingsStore();

    const groupIconMap: Record<number, IconType> = {
        1: 'ads',
        2: 'tracking',
        3: 'share',
        4: 'annoyance',
        5: 'adguard',
        6: 'tune',
        7: 'lang',
        [customGroupId]: 'custom_filter',
    };

    const group = groups.find((g) => g.groupId === groupId);
    const isCustomGroup = groupId === customGroupId;

    let enabled: number;
    if (!isCustomGroup) {
        enabled = filtersByGroups[groupId]?.reduce((prev, id) => {
            if (enabledFilters.has(id)) {
                return prev + 1;
            }
            return prev;
        }, 0);
    } else {
        enabled = (customFilters || []).reduce((prev, f) => {
            if (f.enabled) {
                return prev + 1;
            }
            return prev;
        }, 0);
    }

    return (
        <SettingsItemLink
            className={s.FilterGroup}
            description={translate('filters.enabled', { enabled })}
            icon={groupIconMap[groupId]}
            title={isCustomGroup ? translate('filters.custom.filters') : group?.groupName}
            onClick={onClick}
        />
    );
}

export const FilterGroup = observer(FilterGroupComponent);
