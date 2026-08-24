// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useRef, useState } from 'preact/hooks';

import theme from 'Theme';
import { Icon, Text } from 'UILib';

import s from './Input.module.pcss';

import type { ComponentChild } from 'preact';

export type InputProps = {
    id: string;
    label?: ComponentChild;
    placeholder?: string;
    onChange(value: string): void;
    onClear?(): void;
    onBlur?(e: string): void;
    value?: string | number | string[];
    className?: string;
    invalid?: boolean;
    maxLength?: number | undefined;
    disabled?: boolean;
    error?: boolean;
    errorMessage?: string;
    allowClear?: boolean;
    /** Focus the field when the component mounts (e.g. modal auto-focus). */
    autoFocus?: boolean;
};

/**
 * Input component
 */
export function Input({
    id,
    label,
    placeholder,
    onChange,
    onBlur,
    value,
    className,
    invalid,
    disabled,
    error,
    errorMessage,
    onClear,
    allowClear,
    maxLength,
    autoFocus,
}: InputProps) {
    let handleClear = onClear;
    if (allowClear && !onClear) {
        handleClear = () => onChange('');
    }

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus) {
            inputRef.current?.focus();
        }
    }, [autoFocus]);

    const [focus, setFocus] = useState(false);

    return (
        <div className={className}>
            {label && (
                <label className={s.Input_label} htmlFor={id}>
                    <Text type="t2">
                        {label}
                    </Text>
                </label>
            )}
            <div
                className={cx(
                    s.Input_container,
                    allowClear && s.Input_container__allowClear,
                    invalid && s.Input__invalid,
                    disabled && s.Input__disabled,
                    error && s.Input__error,
                    focus && s.Input_container__focus,
                )}
                onClick={() => {
                    if (disabled) {
                        return;
                    }
                    inputRef.current?.focus();
                }}
            >
                <input
                    ref={inputRef}
                    className={cx(theme.typo.t1, s.Input_input)}
                    disabled={disabled}
                    id={id}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    value={value}
                    onBlur={(e) => {
                        setFocus(false);
                        onBlur?.((e.target as HTMLInputElement).value);
                    }}
                    onFocus={() => setFocus(true)}
                    onInput={(e) => {
                        const element = e.target as HTMLInputElement;
                        onChange(element.value);
                    }}
                />
                {allowClear && value && (
                    <div className={cx(s.Input_clear)} onClick={handleClear}>
                        <Icon className={s.Input_cross} icon="cross" />
                    </div>
                )}
            </div>
            {errorMessage && (
                <Text className={s.Input_errorMessage} type="t2">
                    {errorMessage}
                </Text>
            )}
        </div>
    );
}
