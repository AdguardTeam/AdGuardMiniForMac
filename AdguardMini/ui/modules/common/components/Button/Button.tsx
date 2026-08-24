// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Icon } from 'UILib';

import s from './Button.module.pcss';

import type { ComponentChildren } from 'preact';
import type { IconType } from 'UILib';

type ButtonProps = {
    onClick?(e?: MouseEvent): void;
    /**
     *  1) icon - used to show button, which contains only one Icon (ex. close icon in modals)
     *     icon prop has to be provided
     *     to define icon size - pass iconClassName with needed width/height or default icon size will be used
     *  1.1) iconSmall - same as icon but 16x16
     *  2) submit - main green button (ex. ok button in modals)
     *  3) filled - now used only in tray stories (white button with text)
     *     background and color should be passed in className prop
     *  4) text - button that looks like plain text with action (ex. Cancel button in "checking for updates" popup)
     *  5) outlined - transparent button with border
     */
    type: 'icon' | 'iconSmall' | 'submit' | 'filled' | 'text' | 'outlined';
    icon?: IconType;
    iconClassName?: string;
    children?: ComponentChildren;
    className?: string;
    disabled?: boolean;
    ariaLabel?: string;
    small?: boolean;
    div?: boolean;
};

/**
 * Button component
 * type icon used when only icon is needed to be shown,
 */
export function Button({
    type,
    icon,
    iconClassName,
    children,
    className,
    onClick,
    disabled,
    ariaLabel,
    small,
    div,
    ...restProps
}: ButtonProps) {
    // TODO: fix it
    // In paywall there can be long texts, but text inside is not responding to its container width,
    // So line does not break
    if (div) {
        return (
            <div
                aria-label={ariaLabel}
                className={cx(
                    s.Button,
                    s[`Button__${type}`],
                    small && s.Button__small,
                    className,
                )}
                disabled={disabled}
                type="button"
                onClick={onClick}
                {...restProps}
            >
                {icon && <Icon className={iconClassName} icon={icon} small={type === 'iconSmall'} />}
                {children}
            </div>
        );
    }
    return (
        <button
            aria-label={ariaLabel}
            className={cx(
                s.Button,
                s[`Button__${type}`],
                small && s.Button__small,
                className,
            )}
            disabled={disabled}
            type="button"
            onClick={onClick}
            {...restProps}
        >
            {icon && <Icon className={iconClassName} icon={icon} small={type === 'iconSmall'} />}
            {children}
        </button>
    );
}
