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
        // `.Radio_input` below is `display: none` for the custom `Icon`
        // handler to replace it visually — but a `display: none` element is
        // excluded from the accessibility tree entirely, so without a role on
        // this wrapper the whole control was invisible to VoiceOver: no name,
        // no "radio button" role, no checked/unchecked state, nothing.
        <label
            aria-checked={checked}
            aria-disabled={disabled}
            className={cx(s.Radio, className)}
            htmlFor={id}
            // The rule fires because a `<label>` is not natively interactive —
            // but this one is: it owns the click handler and the tab stop,
            // while the actual radio input it labels is hidden (see above).
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
            role="radio"
            tabIndex={0}
            onClick={onClick ? (e) => {
                if (!disabled) {
                    focusOnBody();
                    onClick(e);
                }
            } : focusOnBody}
        >
            <input
                checked={checked}
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
