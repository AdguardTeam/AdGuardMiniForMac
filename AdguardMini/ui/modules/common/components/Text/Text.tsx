// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import './Text.module.pcss';

import type { ComponentChildren, JSX } from 'preact';

export type TextProps = {
    // Be sure that type are the same with theme/Typography.module.pcss
    type: 'h0' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 't1' | 't2' | 't3';
    children: ComponentChildren;
    wide?: boolean;
    semibold?: boolean;
    className?: string;
    div?: boolean;
    aria?: string;
    lineHeight?: 's' | 'm' | 'l' | 'none';
    onClick?: JSX.DOMAttributes<HTMLElement>['onClick'];
};

/**
 * Text component
 * Cover every type of text due to design system
 */
export function Text({
    type,
    children,
    className,
    aria,
    wide,
    semibold,
    lineHeight,
    div,
    onClick,
}: TextProps): JSX.Element {
    let lineHeightClass: string | undefined = lineHeight;

    if (!lineHeightClass) {
        switch (type) {
            case 'h0':
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                lineHeightClass = 'lh-s';
                break;
            case 't1':
            case 't2':
            case 't3': {
                lineHeightClass = wide ? 'lh-l' : 'lh-m';
            }
        }
    } else if (lineHeight === 'none') {
        lineHeightClass = undefined;
    } else {
        lineHeightClass = `lh-${lineHeight}`;
    }

    const props = {
        className: cx(
            tx.typo[type],
            semibold && tx.typo.semibold,
            lineHeightClass && tx.typo[lineHeightClass],
            className,
        ),
        aria,
        onClick,
    };
    switch (type) {
        case 'h0':
        case 'h1':
            return <h1 {...props}>{children}</h1>;
        case 'h2':
            return <h2 {...props}>{children}</h2>;
        case 'h3':
            return <h3 {...props}>{children}</h3>;
        case 'h4':
            return <h4 {...props}>{children}</h4>;
        case 'h5':
            return <h5 {...props}>{children}</h5>;
        case 'h6':
            return <h6 {...props}>{children}</h6>;
        case 't1':
        case 't2':
        case 't3':
            return div ? <div {...props}>{children}</div> : <p {...props}>{children}</p>;
    }
}
