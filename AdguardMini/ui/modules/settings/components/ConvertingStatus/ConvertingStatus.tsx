// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { URLFilterStatus } from 'Apis/types/URLFilter';
import { useSettingsStore } from 'SettingsLib/hooks';

import { TooltipArea } from '../Tooltip';

import s from './ConvertingStatus.module.pcss';

/**
 * ConvertingStatus - loader on top of the pages, that is used for showing process of rules convertation
 */
function ConvertingStatusComponent() {
    const store = useSettingsStore();

    const { settings: { safariExtensionsLoading }, advancedBlocking: { urlFilterState: { status } } } = store;

    if (!safariExtensionsLoading || status !== URLFilterStatus.loading) {
        return <div className={s.ConvertingStatus_tooltipContainer} />;
    }

    return (
        <TooltipArea
            className={cx(s.ConvertingStatus_tooltipContainer, s.ConvertingStatus_background)}
            showTooltip={status !== URLFilterStatus.loading}
            tooltip={translate('tray.home.title.converting')}
        >
            <div className={s.ConvertingStatus_runner} />
        </TooltipArea>
    );
}

export const ConvertingStatus = observer(ConvertingStatusComponent);
