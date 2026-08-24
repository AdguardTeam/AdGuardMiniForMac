// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Icons } from 'UILib';

import s from './Icon.module.pcss';

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
}: IconProps) {
    return (
        <div
            aria-label={ariaLabel}
            className={cx(s.Icon, className, small && s.Icon__small, big && s.Icon__big, large && s.Icon__large)}
            tabIndex={isFocusable ? 0 : undefined}
            onClick={onClick}
        >
            <Icons icon={icon} />
        </div>
    );
}
