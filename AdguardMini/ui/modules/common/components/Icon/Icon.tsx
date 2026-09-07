// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Icons } from 'UILib';

import s from './Icon.module.pcss';

import type { JSXInternal } from 'preact/src/jsx';
import type { IconType } from 'UILib';

export type IconProps = {
    icon: IconType;
    className?: string;
    small?: boolean;
    big?: boolean;
    large?: boolean;
    onClick?(e: MouseEvent): void;
    ariaLabel?: string;
    isFocusable?: boolean;
    /**
     * ARIA role, e.g. `button` for a clickable icon — without it the icon is
     * a plain `<div>` that screen readers skip entirely.
     */
    role?: JSXInternal.AriaRole;
    /**
     * Hides the icon from assistive tech — for icons that only repeat what the
     * text next to them already says.
     */
    ariaHidden?: boolean;
};

/**
 * Icon component
 * uses to show one icon from Icons sprite
 */
export function Icon({
    icon,
    className,
    onClick,
    small,
    big,
    large,
    ariaLabel,
    isFocusable,
    role,
    ariaHidden,
}: IconProps) {
    return (
        <div
            aria-hidden={ariaHidden}
            aria-label={ariaLabel}
            className={cx(s.Icon, className, small && s.Icon__small, big && s.Icon__big, large && s.Icon__large)}
            role={role}
            tabIndex={isFocusable ? 0 : undefined}
            onClick={onClick}
        >
            <Icons icon={icon} />
        </div>
    );
}
