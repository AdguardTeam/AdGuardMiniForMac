// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';

import s from './Tooltip.module.pcss';

const X_CURSOR_OFFSET = 15;
const Y_CURSOR_OFFSET = 25;

/**
 * Tooltip component
 */
function TooltipComponent() {
    const { ui: { tooltipData } } = useSettingsStore();

    return (
        tooltipData && (
            <div
                className={s.Tooltip}
                style={{
                    left: `${tooltipData.coords.x + X_CURSOR_OFFSET}px`,
                    top: `${tooltipData.coords.y + Y_CURSOR_OFFSET}px`,
                }}
            >
                <div className={s.Tooltip_tooltip}>
                    {tooltipData.renderTooltip()}
                </div>
            </div>
        )
    );
}

export const Tooltip = observer(TooltipComponent);
