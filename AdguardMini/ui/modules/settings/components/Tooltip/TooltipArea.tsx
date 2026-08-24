// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import debounce from 'lodash/debounce';
import { useRef } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';

// eslint-disable-next-line lodash/import-scope
import type { DebouncedFunc } from 'lodash';
import type { ComponentChild, VNode } from 'preact';
import type { HTMLAttributes } from 'preact/compat';

type TooltipAreaProps = {
    children?: ComponentChild;
    showTooltip?: boolean;
    tooltip?: ComponentChild | VNode | string;
    className?: string;
} & HTMLAttributes<HTMLDivElement>;

/**
 * Tooltip debounce time
 */
const TOOLTIP_WAIT_TIME = 300;

/**
 * Tooltip events interceptor
 *
 * @param props
 */
export function TooltipArea({
    children,
    showTooltip = true,
    tooltip,
    ...restProps
}: TooltipAreaProps) {
    const { ui } = useSettingsStore();
    const debounceRef = useRef<DebouncedFunc<(e: MouseEvent) => void> | null>(null);

    debounceRef.current = debounce((e: MouseEvent) => {
        if (showTooltip && tooltip) {
            ui.updateTooltip({
                coords: {
                    x: e.clientX - 10,
                    y: e.clientY - 10,
                },
                renderTooltip: () => tooltip,
            });
        }
    }, TOOLTIP_WAIT_TIME);

    const closeTooltip = () => {
        debounceRef.current?.cancel();
        ui.updateTooltip(null);
    };

    // Use captureLeave here, because in win7 bubbleLeave doesn't work
    return (
        <div
            {...restProps}
            onClick={closeTooltip}
            onMouseEnter={debounceRef.current}
            onMouseLeave={closeTooltip}
            onMouseLeaveCapture={closeTooltip}
            onMouseMove={debounceRef.current}
            onTouchEnd={closeTooltip}
        >
            {children}
        </div>
    );
}
