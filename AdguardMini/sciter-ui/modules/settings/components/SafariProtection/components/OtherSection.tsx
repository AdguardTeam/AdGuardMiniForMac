// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useOtherEnabledFilters, useSettingsStore } from 'SettingsLib/hooks';
import { RouteName, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Text } from 'UILib';

import { SettingsItemLink } from '../../SettingsItem';
import s from '../SafariProtection.module.pcss';

import type { FiltersPageParams } from 'SettingsLib/const/routeParams';

/**
 * Other section for Safari protection
 */
export function OtherSection() {
    const { safariProtection, filters } = useSettingsStore();
    const otherEnabledFiltersIds = useOtherEnabledFilters();

    const { filtersIndex } = filters;
    const otherEnabledFiltersCount = otherEnabledFiltersIds.length;
    const enabledCustomFiltersCount = safariProtection.enabledCustomFiltersCount;
    const customGroupId = filtersIndex.customGroupId;

    return (
        <div className={cx(s.SafariProtection_block, theme.layout.bottomPadding)}>
            <Text className={cx(s.SafariProtection_block_title, theme.layout.content)} type="h5">{translate('safari.protection.part.other')}</Text>
            {otherEnabledFiltersCount > 0 && (
                <SettingsItemLink<FiltersPageParams>
                    description={translate('safari.protection.block.other.desc', { value: otherEnabledFiltersCount })}
                    internalLink={RouteName.filters}
                    internalLinkParams={{
                        filtersIds: otherEnabledFiltersIds,
                        backLink: RouteName.safari_protection,
                    }}
                    title={translate('safari.protection.other.filters')}
                    trackTelemetryEvent={SettingsEvent.OtherFiltersClick}
                />
            )}
            <SettingsItemLink<FiltersPageParams>
                description={translate('safari.protection.block.other.desc', { value: enabledCustomFiltersCount })}
                internalLink={RouteName.filters}
                internalLinkParams={{ groupId: customGroupId, backLink: RouteName.safari_protection }}
                title={translate('filters.custom.filters')}
            />
        </div>
    );
}
