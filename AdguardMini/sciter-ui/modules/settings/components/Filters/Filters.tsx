// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSearch } from '@adg/sciter-utils-kit';
import { observer } from 'mobx-react-lite';
import { useState, useMemo } from 'preact/hooks';

import { TDS_PARAMS, getTdsLink } from 'Common/utils/links';
import { SettingsTitle } from 'Modules/settings/components/SettingsTitle';
import { useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, RouteName } from 'SettingsStore/modules';
import theme from 'Theme';
import { ExternalLink, Icon, Input, Layout, Text } from 'UILib';

import { EditCustomFilterModal, CustomFilter, Filter, FilterGroup, FilterGroupPage } from './components';
import s from './Filters.module.pcss';

import type { GroupWithFilters } from './helpers';
import type { Filter as FilterEnt, FilterGroup as FilterGroupEnt } from 'Apis/types';
import type { FiltersPageParams } from 'SettingsLib/const/routeParams';

/**
 * Used for dividing Filter[] by filterGroups after search;
 */
const divideByGroups = (list: FilterEnt[], groups: FilterGroupEnt[]) => {
    const temp = new Map<number, Set<number>>();
    list.forEach((f) => {
        if (temp.has(f.groupId)) {
            temp.get(f.groupId)!.add(f.id);
        } else {
            const set = new Set<number>();
            set.add(f.id);
            temp.set(f.groupId, set);
        }
    });
    const extendedGroups: GroupWithFilters[] = [];
    groups.forEach((g) => {
        if (temp.has(g.groupId)) {
            extendedGroups.push({
                groupId: g.groupId,
                groupName: g.groupName,
                displayNumber: g.displayNumber,
                filters: Array.from(temp.get(g.groupId)!.values()),
            });
        }
    });
    return extendedGroups;
};

/**
 * Filters page of settings module
 */
function FiltersComponent() {
    const { notification, router, filters: filtersStore, filters: {
        filters: { filters, customFilters },
        filtersIndex: { groups, customGroupId },
        filtersMap,
    } } = useSettingsStore();
    const params = router.castParams<FiltersPageParams>();
    const [groupView, setGroupView] = useState<number | undefined>(params?.groupId);

    const [editCustomFilterId, setEditCustomFilterId] = useState<number | undefined>();

    const onFilterUpdate = async (filter_id: number, name: string, trusted: boolean) => {
        const error = await filtersStore.updateCustomFilter(filter_id, name, trusted);
        if (error) {
            notification.notify({
                message: getNotificationSomethingWentWrongText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
    };

    const {
        foundItems,
        searchQuery,
        updateSearchQuery,
    } = useSearch(filters, ['title']);

    const {
        foundItems: foundCustomFilters,
        updateSearchQuery: updateCustomFiltersSearchQuery,
    } = useSearch(customFilters, ['title']);

    const preselectedFilters = useMemo(() => {
        return params?.filtersIds
            ? foundItems.filter(({ id }) => params.filtersIds?.includes(id))
            : [...foundItems, ...foundCustomFilters];
    }, [foundCustomFilters, foundItems, params?.filtersIds]);

    const data = useMemo(() => divideByGroups(preselectedFilters, groups), [preselectedFilters, groups]);

    let navigationTitle = translate('menu.settings');
    switch (params?.backLink) {
        case RouteName.safari_extensions:
            navigationTitle = translate('settings.safari.ext');
            break;
        case RouteName.safari_protection:
            navigationTitle = translate('menu.safari.protection');
            break;
        case undefined:
            break;
    }
    return (
        <>
            {groupView && (
                <FilterGroupPage
                    backLink={params?.backLink}
                    groupId={groupView}
                    setEditCustomFilterId={setEditCustomFilterId}
                    onBack={() => setGroupView(undefined)}
                />
            )}
            {!groupView && (
                <Layout navigation={{ router, route: params?.backLink ?? RouteName.settings, title: navigationTitle }} type="settingsPage">
                    <SettingsTitle
                        title={translate('filters.filters')}
                    />
                    <div className={theme.layout.content}>
                        <Text className={s.Filters_desc} type="t1">{translate('filters.filters.desc')}</Text>
                        <ExternalLink
                            href={getTdsLink(TDS_PARAMS.what_filters, RouteName.filters)}
                            textType="t1"
                            noUnderline
                        >
                            {translate('filters.what.are.filters')}
                        </ExternalLink>
                        <Input
                            className={cx(s.Filters_search, searchQuery && s.Filters_search__margin)}
                            id="search"
                            placeholder={translate('search')}
                            value={searchQuery}
                            allowClear
                            onChange={(e) => {
                                updateSearchQuery(e);
                                updateCustomFiltersSearchQuery(e);
                            }}
                        />
                    </div>
                    {(searchQuery || params?.filtersIds) && (
                        <>
                            {preselectedFilters.length === 0 ? (
                                <div className={s.Filters_emptyResult}>
                                    <Icon className={s.Filters_emptyResult_icon} icon={searchQuery ? 'noRulesFound' : 'noRules'} />
                                    <div className={s.Filters_emptyResult_text}>
                                        <Text type="t2">{searchQuery ? translate('nothing.found') : translate('user.rules.no.rules')}</Text>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {data.map((group) => (
                                        <div key={group.groupId} className={s.Filters_searchGroup}>
                                            <Text className={cx(s.Filters_searchGroup_title, theme.layout.content)} type="h4">{group.groupName}</Text>
                                            {group.filters.map((f) => (<Filter key={f} filter={filtersMap.get(f)!} />))}
                                        </div>
                                    ))}
                                    {!params?.filtersIds && foundCustomFilters.length > 0 && (
                                        <div className={s.Filters_searchGroup}>
                                            <Text className={cx(s.Filters_searchGroup_title, theme.layout.content)} type="h4">{translate('filters.custom.filters')}</Text>
                                            {foundCustomFilters.map((f) => (
                                                <CustomFilter
                                                    key={f.id}
                                                    filter={f}
                                                    onUpdate={() => setEditCustomFilterId(f.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                    {!(searchQuery || params?.filtersIds) && (
                        <>
                            {groups.map((group) => (
                                <FilterGroup
                                    key={group.groupId}
                                    groupId={group.groupId}
                                    onClick={() => setGroupView(group.groupId)}
                                />
                            ))}
                            <FilterGroup
                                groupId={customGroupId}
                                onClick={() => setGroupView(customGroupId)}
                            />
                        </>
                    )}
                </Layout>
            )}
            {(Array.isArray(customFilters) && typeof editCustomFilterId === 'number' && filtersMap.has(editCustomFilterId)) && (
                <EditCustomFilterModal
                    filter={filtersMap.get(editCustomFilterId)!}
                    onClose={() => setEditCustomFilterId(undefined)}
                    onFilterUpdate={onFilterUpdate}
                />
            )}
        </>
    );
}

export const Filters = observer(FiltersComponent);
