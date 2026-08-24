// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useMemo } from 'preact/hooks';

import { useSettingsStore } from './useSettingsStore';

export const useOtherEnabledFilters = () => {
    const { filters: {
        filtersIndex,
        recommendedFiltersByGroups,
        otherFiltersByGroups,
        enabledFilters,
    } } = useSettingsStore();

    const safari = useMemo(() => {
        if (!filtersIndex.definedGroups) {
            return null;
        }
        const safariProtectionSwitchersFiltersIds = new Set([
            filtersIndex.unblockSearchAdsFilterId,
            filtersIndex.cookieNoticeFilterId,
            filtersIndex.popUpsFilterId,
            filtersIndex.widgetsFilterId,
            filtersIndex.otherAnnoyanceFilterId,
            ...(recommendedFiltersByGroups[filtersIndex.definedGroups.adBlocking] || []),
            ...(recommendedFiltersByGroups[filtersIndex.definedGroups.privacy] || []),
            ...(recommendedFiltersByGroups[filtersIndex.definedGroups.socialWidgets] || []),
            ...(recommendedFiltersByGroups[filtersIndex.definedGroups.languageSpecific] || []),
        ]);
        return safariProtectionSwitchersFiltersIds;
    }, [filtersIndex, recommendedFiltersByGroups]);

    const all = useMemo(() => {
        return [
            ...Object.values(otherFiltersByGroups).flat(1),
            ...Object.values(recommendedFiltersByGroups).flat(1),
        ];
    }, [otherFiltersByGroups, recommendedFiltersByGroups]);

    const filtersIds = useMemo(() => {
        if (!safari) {
            return [];
        }
        return all.filter((id) => (
            enabledFilters.has(id)
            && id !== filtersIndex.unblockSearchAdsFilterId
            && !safari.has(id)
        ));
    }, [safari, all, enabledFilters, filtersIndex.unblockSearchAdsFilterId]);

    return filtersIds;
};
