// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Text, Icon } from 'UILib';

import s from './ExternalLink.module.pcss';

import type { ComponentChildren } from 'preact';
import type { JSXInternal } from 'preact/src/jsx';
import type { IconType, TextProps } from 'UILib';

export type ExternalLinkProps = {
    href: string;
    textType?: TextProps['type'];
    className?: string;
    children?: ComponentChildren;
    // TODO: refactor all use with custom class
    noUnderline?: boolean;
    icon?: IconType;
    noLineHeight?: boolean;
    color?: 'green' | 'red' | 'inheritColor';
    onClick?: JSXInternal.DOMAttributes<HTMLAnchorElement>['onClick'];
    /**
     * Accessible name — required for the icon-only form, which renders no text
     * and would otherwise be announced as a nameless link.
     */
    ariaLabel?: string;
};

/**
 * Component for open external links
 */
export function ExternalLink({
    href,
    textType,
    className,
    children,
    noUnderline,
    icon,
    noLineHeight,
    onClick,
    color = 'green',
    ariaLabel,
}: ExternalLinkProps) {
    return (
        <a
            aria-label={ariaLabel}
            className={cx(s.ExternalLink, s[`ExternalLink__${color}`], className, noUnderline && s.ExternalLink__noUnderline)}
            href={href}
            rel="noopener noreferrer"
            target="_blank"
            onClick={onClick}
        >
            {icon && <Icon className={s[`ExternalLink__${color}`]} icon={icon} />}
            {!icon && <Text className={s.ExternalLink_text} lineHeight={noLineHeight ? 'none' : undefined} type={textType || 't1'}>{children}</Text>}
        </a>
    );
}
