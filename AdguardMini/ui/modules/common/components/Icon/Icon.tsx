// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { activateOnKeyDown } from 'Common/lib/keyboardActivation';
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
    /**
     * Click action. The `MouseEvent` is optional: pointer clicks receive it,
     * keyboard activation (Enter/Space on a focusable icon) runs the action
     * without a fabricated event.
     */
    onClick?(e?: MouseEvent): void;
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
        // The shared glyph wrapper: interactive callers pass `isFocusable`
        // and `role`, which is what adds the tab stop and the Enter/Space
        // path below. The rule cannot resolve the conditional role; other
        // icons are decorative or sit inside a control that owns the path.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
            aria-hidden={ariaHidden}
            aria-label={ariaLabel}
            className={cx(s.Icon, className, small && s.Icon__small, big && s.Icon__big, large && s.Icon__large)}
            role={role}
            tabIndex={isFocusable ? 0 : undefined}
            onClick={onClick}
            onKeyDown={isFocusable ? activateOnKeyDown(() => onClick?.()) : undefined}
        >
            <Icons icon={icon} />
        </div>
    );
}
