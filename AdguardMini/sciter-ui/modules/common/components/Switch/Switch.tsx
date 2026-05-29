// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import s from './Switch.module.pcss';

export type SwitchProps = {
    checked: boolean;
    onChange(checked: boolean): void;
    className?: string;
    labelClassName?: string;
    disabled?: boolean;
    muted?: boolean;
    id?: string;
    name?: string;
    ariaLabel?: string;
    icon?: boolean;
    testId?: string;
};

/**
 * Switches toggle the state of a single setting on or off.
 */
export function Switch({
    checked,
    className,
    labelClassName,
    disabled,
    muted,
    onChange,
    id,
    name,
    ariaLabel,
    icon,
    testId,
}: SwitchProps) {
    return (
        <label
            id={testId}
            aria-label={ariaLabel}
            className={cx(s.switch, className)}
            htmlFor={id}
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                    onChange(!checked);
                }
            }}
        >
            <input
                checked={checked}
                className={cx(s.input, s.checked)}
                disabled={disabled}
                id={id}
                name={name}
                type="checkbox"
                onInput={(e) => {
                    e.stopPropagation();
                }}
            />
            <div
                className={cx(
                    s.label,
                    icon && (checked ? s.enabled : s.disabled),
                    !icon && (checked ? s.labelEnabled : s.labelDisabled),
                    !icon && muted && s.muted,
                    s.labelTransitions,
                    labelClassName,
                )}
                onClick={(e) => e.stopPropagation()}
            />
        </label>
    );
}
