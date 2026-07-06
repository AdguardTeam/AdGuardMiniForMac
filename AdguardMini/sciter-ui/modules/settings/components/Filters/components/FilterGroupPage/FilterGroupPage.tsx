// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState, useEffect, useMemo, useLayoutEffect } from 'preact/hooks';

import { SettingsTitle } from 'Modules/settings/components/SettingsTitle';
import { useSettingsStore } from 'Modules/settings/lib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType } from 'SettingsStore/modules';
import theme from 'Theme';
import { Icon, Layout, Text } from 'UILib';

import { AddCustomFilterModal, CustomFilter, Filter, RemoveAllCustomFiltersModal } from '..';

import s from './FilterGroupPage.module.pcss';

import type { RouteName } from 'SettingsStore/modules';

export type FilterGroupPageProps = {
    groupId: number;
    onBack(): void;
    backLink?: RouteName;
    setEditCustomFilterId(id: number): void;
};

/**
 * Page for showing single filter's group
 */
function FilterGroupPageComponent({
    groupId,
    onBack,
    backLink,
    setEditCustomFilterId,
}: FilterGroupPageProps) {
    const {
        router,
        filtersMeta: {
            filters: { customFilters },
            filtersMap,
            filtersIndex: { groups, customGroupId },
            filtersByGroups,
            enabledFilters,
        },
        customFilters: customFiltersStore,
        notification,
    } = useSettingsStore();
    const [addFilterModal, setAddFilterModal] = useState(false);
    const [removeAllCustomFiltersModal, setRemoveAllCustomFiltersModal] = useState(false);

    const isCustomGroup = groupId === customGroupId;

    const group = groups.find((g) => g.groupId === groupId);

    const handleBack = () => {
        if (backLink) {
            router.changePath(backLink);
        } else {
            onBack();
        }
    };

    useEffect(() => {
        if (customFiltersStore.customFiltersSubscribeURL) {
            setAddFilterModal(true);
        }
    }, [customFiltersStore.customFiltersSubscribeURL]);

    const settingsTitleElements = useMemo(() => {
        const elements = [];
        if (isCustomGroup && customFilters.length) {
            elements.push({
                action: () => setRemoveAllCustomFiltersModal(true),
                text: translate('remove.all'),
                className: theme.button.redText,
            });
        }
        return elements.length ? elements : undefined;
    }, [isCustomGroup, customFilters]);

    const [nonCustomFilters, setNonCustomFilters] = useState<number[]>(isCustomGroup
        ? []
        : (filtersByGroups[groupId] ?? []));

    useLayoutEffect(() => {
        if (!isCustomGroup) {
            setNonCustomFilters([
                ...(filtersByGroups[groupId] ?? []).filter((f: number) => enabledFilters.has(f)),
                ...(filtersByGroups[groupId] ?? []).filter((f: number) => !enabledFilters.has(f)),
            ]);
        }
    }, []);

    return (
        <Layout navigation={{ onClick: handleBack, title: backLink ? translate('menu.safari.protection') : translate('filters.filters') }} type="settingsPage">
            <SettingsTitle
                description={isCustomGroup ? translate('filters.custom.filters.desc') : undefined}
                elements={settingsTitleElements}
                title={isCustomGroup ? translate('filters.custom.filters') : group?.groupName}
            />
            {!isCustomGroup && nonCustomFilters.map((f: number) => (
                <Filter
                    key={f}
                    filter={filtersMap.get(f)!}
                />
            ))}
            {isCustomGroup && (
                <>
                    <div className={s.FilterGroupPage_addFilter} role="button" tabIndex={0} onClick={() => setAddFilterModal(true)}>
                        <Icon icon="plus" />
                        <Text className={s.FilterGroupPage_addFilter_text} lineHeight="none" type="t1">{translate('filters.add.custom')}</Text>
                    </div>
                    {customFilters?.length > 0 ? (customFilters.map((f) => (
                        <CustomFilter
                            key={f.id + f.title}
                            filter={filtersMap.get(f.id) || f}
                            onUpdate={() => setEditCustomFilterId(f.id)}
                        />
                    ))) : (
                        <div className={s.FilterGroupPage_emptyResult}>
                            <Icon className={s.FilterGroupPage_emptyResult_icon} icon="noRules" />
                            <div className={s.FilterGroupPage_emptyResult_text}>
                                <Text type="t2">{translate('filters.custom.no.filters')}</Text>
                            </div>
                        </div>
                    )}
                </>
            )}
            {addFilterModal && (
                <AddCustomFilterModal
                    onClose={() => setAddFilterModal(false)}
                />
            )}
            {removeAllCustomFiltersModal && (
                <RemoveAllCustomFiltersModal
                    onClose={() => setRemoveAllCustomFiltersModal(false)}
                    onSubmit={() => {
                        const { confirmDelete, undoDelete } = customFiltersStore.prepareCustomFiltersForDeletion();

                        notification.notify({
                            message: translate('notification.all.custom.filters.removed'),
                            notificationContext: NotificationContext.info,
                            iconType: NotificationsQueueIconType.done,
                            type: NotificationsQueueType.success,
                            undoAction: () => {
                                undoDelete();
                            },
                            onClose: async () => {
                                const error = await confirmDelete();
                                if (error) {
                                    notification.notify({
                                        message: getNotificationSomethingWentWrongText(),
                                        notificationContext: NotificationContext.info,
                                        type: NotificationsQueueType.warning,
                                        iconType: NotificationsQueueIconType.error,
                                        closeable: true,
                                    });
                                }
                            },
                        });
                    }}
                />
            )}
        </Layout>
    );
}

export const FilterGroupPage = observer(FilterGroupPageComponent);
