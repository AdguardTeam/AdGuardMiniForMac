// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useId } from 'preact/hooks';

import { useFocusOnMount } from 'Common/hooks/useFocusOnMount';
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

    // A new page mounts a new `SettingsTitle`, so focusing on mount is the
    // same thing as focusing on navigation — without the router having to hunt
    // for this heading in the document.
    const titleId = useId();
    useFocusOnMount(titleId);

    return (
        <div className={cx(s.SettingsTitle, maxTopPadding && s.SettingsTitle__maxTopPadding)}>
            <div className={cx(s.SettingsTitle_titleBlock, theme.layout.content)}>
                {/* `tabIndex={-1}`: focusable programmatically, no tab stop. */}
                <Text
                    className={cx(!newLabel && s.SettingsTitle_title)}
                    id={titleId}
                    lineHeight="s"
                    tabIndex={-1}
                    type="h4"
                >
                    {title}
                </Text>
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
