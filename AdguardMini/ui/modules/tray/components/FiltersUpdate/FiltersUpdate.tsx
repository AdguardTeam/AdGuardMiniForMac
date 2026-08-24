// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Button, Text } from 'Common/components';
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
                    icon="back"
                    iconClassName={theme.button.grayIcon}
                    type="icon"
                    onClick={() => router.changePath(TrayRoute.updates, { noUpdate: true })}
                />
            </div>
            <div>
                <Text className={s.FiltersUpdate_title} type="h4">{translate('tray.updates')}</Text>
            </div>
            <div>
                {data?.map((filter) => (
                    <div key={filter.id} className={s.FiltersUpdate_filter}>
                        <Text className={s.FiltersUpdate_filter_name} type="t2">{filter.name}</Text>
                        <Text className={filter.success ? undefined : s.FiltersUpdate_filter__orange} type="t2">{filter.version}</Text>
                    </div>
                ))}
            </div>
        </div>
    );
}

export const FiltersUpdate = observer(FiltersUpdateComponent);
