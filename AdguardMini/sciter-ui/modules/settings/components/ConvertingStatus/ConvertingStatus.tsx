// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { propagationStopper } from '@adg/sciter-utils-kit';
import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';

import { TooltipArea } from '../Tooltip';

import s from './ConvertingStatus.module.pcss';

/**
 * ConvertingStatus - loader on top of the pages, that is used for showing process of rules convertation
 */
function ConvertingStatusComponent() {
    const store = useSettingsStore();

    const { safariExtensions } = store;
    const { safariExtensionsLoading } = safariExtensions;

    if (!safariExtensionsLoading) {
        return <div className={s.ConvertingStatus_tooltipContainer} />;
    }

    return (
        <TooltipArea
            className={cx(s.ConvertingStatus_tooltipContainer, s.ConvertingStatus_background)}
            tooltip={translate('tray.home.title.converting')}
            onContextMenu={propagationStopper}
        >
            <div className={s.ConvertingStatus_runner} />
        </TooltipArea>
    );
}

export const ConvertingStatus = observer(ConvertingStatusComponent);
