// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';
import { Text } from 'UILib';

import { ContextMenu } from '../ContextMenu';

import s from './SettingsTitle.module.pcss';

import type { ContextMenuProps } from '../ContextMenu';
import type { ComponentChildren } from 'preact';

type SettingsTitleProps = {
    title: string;
    description?: string;
    maxTopPadding?: boolean;
    children?: ComponentChildren;
    newLabel?: boolean;
} & Partial<ContextMenuProps>;

/**
 * Title element for all pages in settings module
 */
export function SettingsTitle({
    title,
    description,
    children,
    elements,
    maxTopPadding,
    reportBug,
    showReportBugTooltip,
    newLabel,
}: SettingsTitleProps) {
    const doubleContextMenu = elements && reportBug;
    return (
        <div className={cx(s.SettingsTitle, maxTopPadding && s.SettingsTitle__maxTopPadding)}>
            <div className={cx(s.SettingsTitle_titleBlock, theme.layout.content)}>
                <Text className={cx(!newLabel && s.SettingsTitle_title)} lineHeight="s" type="h4">{title}</Text>
                {newLabel && (<div className={s.SettingsTitle_newLabel}><Text type="t2">New</Text></div>)}
                {/* We have to use context menu twice due to on UserRules page
                we have to show report bug and context menu separately */}
                {doubleContextMenu && (
                    <>
                        <ContextMenu className={s.SettingsTitle_contextMenu} reportBug={reportBug} />
                        <ContextMenu elements={elements} />
                    </>
                )}
                {!doubleContextMenu && (elements || reportBug) && (
                    <ContextMenu
                        elements={elements || []}
                        reportBug={reportBug}
                        showReportBugTooltip={showReportBugTooltip}
                    />
                )}
            </div>
            {(description || children) && (
                <div className={theme.layout.content}>
                    {description && <Text className={s.SettingsTitle_desc} type="t1">{description}</Text>}
                    {children}
                </div>
            )}
        </div>
    );
}
