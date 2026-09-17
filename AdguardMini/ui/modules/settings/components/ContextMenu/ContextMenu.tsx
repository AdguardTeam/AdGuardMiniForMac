// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import debounce from 'lodash/debounce';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'preact/hooks';

import { useOverlay } from 'Common/hooks/useOverlay';
import { buttonProps } from 'Common/lib/keyboardActivation';
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

export type ContextMenuProps = {
    elements?: {
        text: string;
        action(): void;
        className?: string;
        /**
         * Overrides the item's accessible name — e.g. to append an
         * "opens in browser" hint without changing the visible `text`.
         */
        ariaLabel?: string;
    }[];
    reportBug?: boolean;
    className?: string;
    showReportBugTooltip?: boolean;
};

/**
 * Context dropdown menu
 */
function ContextMenuComponent({ elements, reportBug, className, showReportBugTooltip }: ContextMenuProps) {
    const { router, ui, telemetry } = useSettingsStore();

    const containerRef = useRef<HTMLDivElement>(null);

    // The same instance shows either the menu or a hover tooltip, never both;
    // the tooltip paths close with `hover`, whose plan leaves focus alone.
    const {
        isOpen: open,
        close: closeContextMenu,
        open: openContextMenu,
        toggle: toggleContextMenu,
    } = useOverlay(containerRef);

    const debounceRef = useRef<DebouncedFunc<(e: MouseEvent) => void> | null>(null);

    debounceRef.current = debounce(() => {
        if (!open) {
            openContextMenu();
            ui.hideProblemLabel();
        }
    }, TOOLTIP_WAIT_TIME);

    const closeTooltip = () => {
        debounceRef.current?.cancel();
        closeContextMenu('hover');
    };

    useEffect(() => {
        let canUpdate = true;
        if (showReportBugTooltip) {
            openContextMenu();
            // We can not use 1 setTimeout due to text changing earlier than tooltip is hidden
            setTimeout(() => {
                if (canUpdate) {
                    closeContextMenu('hover');
                }
            }, TIMEOUT_REPORT_TOOLTIP_SHOW);
            setTimeout(() => {
                ui.hideProblemLabel();
            }, TIMEOUT_REPORT_TOOLTIP_TEXT);
        }
        return () => {
            canUpdate = false;
        };
    }, [showReportBugTooltip, ui, openContextMenu, closeContextMenu]);

    const handleAction = (action: () => void) => () => {
        // Restore first: the surface this action opens (a modal, usually)
        // captures its opener at commit, and the restored trigger is what it
        // must return focus to when it closes.
        closeContextMenu('action');
        action();
    };

    return (
        <div ref={containerRef} className={cx(s.ContextMenu, className)}>
            {reportBug ? (
                // The nested Button is the tab stop; its native Enter/Space
                // activation dispatches a click that bubbles to this wrapper,
                // so the wrapper itself needs no keyboard path.
                /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                    jsx-a11y/no-static-element-interactions */
                <div
                    onClick={() => {
                        telemetry.trackEvent(SettingsEvent.FlagClick);
                        router?.changePath(RouteName.contact_support);
                    }}
                    onMouseEnter={debounceRef.current}
                    onMouseLeave={closeTooltip}
                    onMouseLeaveCapture={closeTooltip}
                    onMouseMove={debounceRef.current}
                    onTouchEnd={closeTooltip}
                >
                    <Button
                        ariaLabel={translate('context.menu.report.problem')}
                        icon="flag"
                        iconClassName={theme.button.grayIcon}
                        type="icon"
                    />
                </div>
            ) : (
                <Button
                    ariaLabel={translate('context.menu.more.options')}
                    icon="context"
                    iconClassName={theme.button.grayIcon}
                    type="icon"
                    onClick={toggleContextMenu}
                />
            )}
            {open && (
                <div className={cx(s.ContextMenu_context, reportBug && s.ContextMenu_context__tooltip)}>
                    {reportBug ? (
                        <div className={s.ContextMenu_action}>
                            <Text lineHeight="none" type="t1">
                                {showReportBugTooltip ? translate('context.menu.report.problem.tooltip') : translate('context.menu.report.problem')}
                            </Text>
                        </div>
                    ) : elements?.map(({
                        text, action, className: cs, ariaLabel,
                    }) => (
                        <div
                            key={text}
                            aria-label={ariaLabel}
                            className={s.ContextMenu_action}
                            {...buttonProps(handleAction(action))}
                        >
                            <Text className={cs} lineHeight="none" type="t1">{text}</Text>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export const ContextMenu = observer(ContextMenuComponent);
