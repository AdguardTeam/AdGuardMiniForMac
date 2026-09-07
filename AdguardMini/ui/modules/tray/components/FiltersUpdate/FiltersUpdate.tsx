// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useId } from 'preact/hooks';

import { Button, Text } from 'Common/components';
import { useFocusOnMount } from 'Common/hooks/useFocusOnMount';
import theme from 'Theme';
import { useTrayStore, useMoreFrequentUpdatesNotify } from 'TrayLib/hooks';
import { TrayRoute } from 'TrayStore/modules';

import s from './FiltersUpdate.module.pcss';

/**
 * Component that shows which filters were updated
 */
function FiltersUpdateComponent() {
    const { router, settings } = useTrayStore();
    useMoreFrequentUpdatesNotify();
    const { filtersUpdateResult, filtersMap } = settings;

    const baseId = useId();

    // Announces the page on arrival — see `useFocusOnMount`.
    const titleId = useId();
    useFocusOnMount(titleId);

    if (!filtersMap) {
        return null;
    }

    const data = filtersUpdateResult?.status.map((filter) => ({
        id: filter.id,
        name: filtersMap.find((fa) => fa.id === filter.id)?.title,
        version: filter.success ? filter.version : translate('tray.update.filters.filter.update.failed'),
        success: filter.success,
    }));
    return (
        <div className={s.FiltersUpdate}>
            <div className={s.FiltersUpdate_header}>
                <Button
                    ariaLabel={translate('back')}
                    icon="back"
                    iconClassName={theme.button.grayIcon}
                    type="icon"
                    onClick={() => router.changePath(TrayRoute.updates, { noUpdate: true })}
                />
            </div>
            <div>
                <Text className={s.FiltersUpdate_title} id={titleId} tabIndex={-1} type="h4">{translate('tray.updates')}</Text>
            </div>
            {/*
              * A list, stepped through one row at a time: the name sits in one
              * column and its version in another, so read separately they
              * arrive as loose fragments. Each row names itself from its own
              * content, and `listitem` adds the position — "3 of 12".
              */}
            <div role="list">
                {data?.map((filter) => {
                    const rowId = `${baseId}-${filter.id}`;

                    return (
                        <div
                            key={filter.id}
                            aria-labelledby={rowId}
                            className={s.FiltersUpdate_filter}
                            id={rowId}
                            role="listitem"
                            tabIndex={0}
                        >
                            <Text className={s.FiltersUpdate_filter_name} type="t2">{filter.name}</Text>
                            <Text className={filter.success ? undefined : s.FiltersUpdate_filter__orange} type="t2">{filter.version}</Text>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export const FiltersUpdate = observer(FiltersUpdateComponent);
