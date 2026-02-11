// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEscape, useClickOutside } from '@adg/sciter-utils-kit';
import debounce from 'lodash/debounce';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Button, Text } from 'UILib';

/**
 * Tooltip debounce time
 */
const TOOLTIP_WAIT_TIME = 300;

const TIMEOUT_REPORT_TOOLTIP_TEXT = 5000;
const TIMEOUT_REPORT_TOOLTIP_SHOW = 4500;

import s from './ContextMenu.module.pcss';

// eslint-disable-next-line lodash/import-scope
import type { DebouncedFunc } from 'lodash';
import type { ContactSupportRouterParams } from 'SettingsStore/modules';

export type ContextMenuProps = {
    elements?: {
        text: string;
        action(): void;
        className?: string;
    }[];
    navigateContactSupport?: ContactSupportRouterParams;
    className?: string;
    showReportBugTooltip?: boolean;
};

/**
 * Context dropdown menu
 */
function ContextMenuComponent({ elements, navigateContactSupport, className, showReportBugTooltip }: ContextMenuProps) {
    const { router, ui, telemetry } = useSettingsStore();
    const [open, setOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const closeContextMenu = useCallback(() => setOpen(false), []);

    useEscape(closeContextMenu);
    useClickOutside(containerRef, closeContextMenu);

    const debounceRef = useRef<DebouncedFunc<(e: MouseEvent) => void> | null>(null);

    debounceRef.current = debounce(() => {
        if (!open) {
            setOpen(true);
            ui.hideProblemLabel();
        }
    }, TOOLTIP_WAIT_TIME);

    const closeTooltip = () => {
        debounceRef.current?.cancel();
        setOpen(false);
    };

    useEffect(() => {
        let canUpdate = true;
        if (showReportBugTooltip) {
            setOpen(true);
            // We can not use 1 setTimeout due to text changing earlier than tooltip is hidden
            setTimeout(() => {
                if (canUpdate) {
                    setOpen(false);
                }
            }, TIMEOUT_REPORT_TOOLTIP_SHOW);
            setTimeout(() => {
                ui.hideProblemLabel();
            }, TIMEOUT_REPORT_TOOLTIP_TEXT);
        }
        return () => {
            canUpdate = false;
        };
    }, [showReportBugTooltip, ui]);

    const handleAction = (action: () => void) => () => {
        closeContextMenu();
        action();
    };

    return (
        <div ref={containerRef} className={cx(s.ContextMenu, className)}>
            {navigateContactSupport ? (
                <div
                    onClick={() => {
                        telemetry.trackEvent(SettingsEvent.FlagClick);
                        router?.changePath(RouteName.contact_support, navigateContactSupport);
                    }}
                    onMouseEnter={debounceRef.current}
                    onMouseLeave={closeTooltip}
                    onMouseLeaveCapture={closeTooltip}
                    onMouseMove={debounceRef.current}
                    onTouchEnd={closeTooltip}
                >
                    <Button icon="flag" iconClassName={theme.button.grayIcon} type="icon" />
                </div>
            ) : (
                <Button icon="context" iconClassName={theme.button.grayIcon} type="icon" onClick={() => setOpen(!open)} />
            )}
            {open && (
                <div className={cx(s.ContextMenu_context, navigateContactSupport && s.ContextMenu_context__tooltip)}>
                    {navigateContactSupport ? (
                        <div className={s.ContextMenu_action}>
                            <Text lineHeight="none" type="t1">
                                {showReportBugTooltip ? translate('context.menu.report.problem.tooltip') : translate('context.menu.report.problem')}
                            </Text>
                        </div>
                    ) : elements?.map(({ text, action, className: cs }) => (
                        <div key={text} className={s.ContextMenu_action} role="button" onClick={handleAction(action)}>
                            <Text className={cs} lineHeight="none" type="t1">{text}</Text>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export const ContextMenu = observer(ContextMenuComponent);
