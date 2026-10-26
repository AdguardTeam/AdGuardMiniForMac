// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { isValidElement } from 'preact';

import { buttonProps } from 'Common/lib/keyboardActivation';
import theme from 'Theme';
import { Text } from 'UILib';

import s from './Troubleshooting.module.pcss';

import type { ComponentChildren, RefObject } from 'preact';

/**
 * Props for the Troubleshooting component.
 * @param blockRef - Ref to the block element, so the page can scroll the
 * steps into view when the failure snack points here
 * @param isInstalled - Whether the URL filter is installed; the reset and
 * remove actions are unavailable without it, as in the title menu
 * @param setShowResetCacheModal - Opens the Reset cache confirmation modal
 * @param setShowRemoveFilterModal - Opens the Remove URL filter confirmation modal
 * @param onContactSupport - Opens the Contact support screen
 */
type TroubleshootingProps = {
    blockRef?: RefObject<HTMLDivElement>;
    isInstalled: boolean;
    setShowResetCacheModal(value: boolean): void;
    setShowRemoveFilterModal(value: boolean): void;
    onContactSupport(): void;
};

/**
 * Wraps the `<br>`-separated iCloud host list in its own block. WebKit fills
 * the selection gap of every hard-broken line up to the selection root, so
 * without a root of its own the highlight spans the whole page.
 * @param children - Translated DNS step nodes
 * @returns The nodes with the host list wrapped, or unchanged when there is
 * no host list to wrap
 */
function wrapDnsHosts(children: ComponentChildren): ComponentChildren {
    if (!Array.isArray(children)) {
        return children;
    }

    const nodes = children as ComponentChildren[];
    const breaks: number[] = [];

    nodes.forEach((child, index) => {
        if (isValidElement(child) && child.type === 'br') {
            breaks.push(index);
        }
    });

    if (breaks.length < 2) {
        return children;
    }

    const firstBreak = breaks[0];
    const lastBreak = breaks[breaks.length - 1];

    return [
        ...nodes.slice(0, firstBreak),
        <span key="dns-hosts" className={s.Troubleshooting_domains}>
            {nodes.slice(firstBreak + 1, lastBreak)}
        </span>,
        ...nodes.slice(lastBreak + 1),
    ];
}

/**
 * Troubleshooting block of the System-wide Protection settings page.
 * Lists the steps that may bring a failed System-wide Protection back up,
 * including the iCloud hosts a DNS filter must not block, and links to the
 * actions the steps refer to.
 * @param props - Component props
 */
export function Troubleshooting({
    blockRef,
    isInstalled,
    setShowResetCacheModal,
    setShowRemoveFilterModal,
    onContactSupport,
}: TroubleshootingProps) {
    /**
     * Renders a step link. A disabled action stays readable as plain text,
     * with no button semantics or click.
     */
    const renderLink = (action: () => void, text: string, disabled = false) => {
        if (disabled) {
            return <span className={s.Troubleshooting_link_disabled}>{text}</span>;
        }
        return (
            <span
                className={cx(s.Troubleshooting_link, theme.button.underline)}
                {...buttonProps(action)}
            >
                {text}
            </span>
        );
    };

    return (
        <div ref={blockRef} className={s.Troubleshooting_block}>
            <Text className={s.Troubleshooting_block_title} type="h5">
                {translate('advanced.blocking.system.wide.part.troubleshooting')}
            </Text>
            <Text className={s.Troubleshooting_block_desc} type="t1" wide>
                {translate('advanced.blocking.system.wide.part.troubleshooting.desc')}
            </Text>
            <ol className={s.Troubleshooting_list}>
                <li>
                    <Text type="t1" wide>{translate('advanced.blocking.system.wide.part.troubleshooting.connection')}</Text>
                </li>
                <li>
                    <Text type="t1" wide>
                        {wrapDnsHosts(translate('advanced.blocking.system.wide.part.troubleshooting.dns'))}
                    </Text>
                </li>
                <li>
                    <Text type="t1" wide>{translate('advanced.blocking.system.wide.part.troubleshooting.restart')}</Text>
                </li>
                <li>
                    <Text type="t1" wide>
                        {translate('advanced.blocking.system.wide.part.troubleshooting.reset.cache', {
                            link: (text: string) => renderLink(
                                () => setShowResetCacheModal(true),
                                text,
                                !isInstalled,
                            ),
                        })}
                    </Text>
                </li>
                <li>
                    <Text type="t1" wide>
                        {translate('advanced.blocking.system.wide.part.troubleshooting.reinstall', {
                            link: (text: string) => renderLink(
                                () => setShowRemoveFilterModal(true),
                                text,
                                !isInstalled,
                            ),
                        })}
                    </Text>
                </li>
                <li>
                    <Text type="t1" wide>
                        {translate('advanced.blocking.system.wide.part.troubleshooting.support', {
                            link: (text: string) => renderLink(onContactSupport, text),
                        })}
                    </Text>
                </li>
            </ol>
        </div>
    );
}
