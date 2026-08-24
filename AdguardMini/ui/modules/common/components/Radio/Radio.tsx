// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { focusOnBody } from '@adg/webview-utils-kit';

import { Icon } from 'UILib';

import s from './Radio.module.pcss';

import type { ComponentChildren, JSX } from 'preact';

type RadioProps = {
    children?: ComponentChildren;
    checked: boolean;
    className?: string;
    labelClassName?: string;
    disabled?: boolean;
    muted?: boolean;
    id?: string;
    name?: string;
    onClick?(e: JSX.TargetedMouseEvent<HTMLElement>): void;
};

/**
 * Radio component
 */
export function Radio({
    checked,
    children,
    className,
    labelClassName,
    disabled,
    muted,
    id,
    name,
    onClick,
}: RadioProps) {
    return (
        <label
            className={cx(s.Radio, className)}
            htmlFor={id}
            onClick={onClick ? (e) => {
                if (!disabled) {
                    focusOnBody();
                    onClick(e);
                }
            } : focusOnBody}
        >
            <input
                className={s.Radio_input}
                disabled={disabled}
                id={id}
                name={name}
                type="radio"
            />
            <Icon className={cx(s.Radio_handler, checked && !muted && s.Radio_handler__checked)} icon={checked ? 'radioChecked' : 'radioUnchecked'} />
            {children && (
                <div className={cx(s.Radio_label, disabled && s.Radio_label__disabled, labelClassName)}>
                    {children}
                </div>
            )}
        </label>
    );
}
