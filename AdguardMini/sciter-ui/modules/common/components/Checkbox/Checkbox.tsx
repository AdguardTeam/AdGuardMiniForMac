// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useRef } from 'preact/hooks';

import s from './Checkbox.module.pcss';
import { CheckboxIcon } from './CheckboxIcon';

import type { ComponentChild } from 'preact';

type CheckboxProps = {
    checked: boolean;
    children?: ComponentChild;
    className?: string;
    labelClassName?: string;
    disabled?: boolean;
    muted?: boolean;
    onChange(e: boolean): void;
    id?: string;
    testId?: string;
};

/**
 * Checkbox checker
 */
export function Checkbox({
    checked,
    children,
    className,
    labelClassName,
    disabled,
    muted,
    onChange,
    id,
    testId,
}: CheckboxProps) {
    const ref = useRef<HTMLLabelElement>(null);

    return (
        <label
            ref={ref}
            id={testId}
            className={cx(s.Checkbox, disabled && s.Checkbox__disabled, className)}
            htmlFor={id}
            onClick={() => onChange(!checked)}
        >
            <input
                checked={checked}
                className={s.Checkbox_input}
                disabled={disabled}
                id={id}
                type="checkbox"
                onInput={(e) => onChange(e.currentTarget.checked)}
            />
            <CheckboxIcon checked={checked} muted={muted} />
            {children && (
                <div className={cx(s.Checkbox_label, labelClassName)}>
                    {children}
                </div>
            )}
        </label>
    );
}
