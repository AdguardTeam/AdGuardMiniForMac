// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useRef, useEffect, useState } from 'preact/hooks';

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
    autoFocus?: boolean;
    maxLength?: number | undefined;
    disabled?: boolean;
    error?: boolean;
    errorMessage?: string;
    allowClear?: boolean;
    testId?: string;
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
    autoFocus,
    disabled,
    error,
    errorMessage,
    onClear,
    allowClear,
    testId,
}: InputProps) {
    const resolvedId = testId ?? id;

    let handleClear = onClear;
    if (allowClear && !onClear) {
        handleClear = () => onChange('');
    }

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    useEffect(() => {
        const onContextMenu = (e: Event) => {
            e.preventDefault();
            return true;
        };
        if (inputRef.current) {
            inputRef.current.addEventListener('contextmenu', onContextMenu);

            return () => {
                inputRef.current?.removeEventListener('contextmenu', onContextMenu);
            };
        }
    }, []);

    const [focus, setFocus] = useState(false);
    useEffect(() => {
        const handleOnInput = (e: Event) => {
            const element = e.target as HTMLInputElement;
            onChange(element.value);
        };

        const handleOnFocus = () => {
            setFocus(true);
        };

        const inputElement = inputRef.current;

        inputElement?.addEventListener('input', handleOnInput);
        inputElement?.addEventListener('focus', handleOnFocus);

        return () => {
            inputElement?.removeEventListener('input', handleOnInput);
            inputElement?.removeEventListener('focus', handleOnFocus);
        };
    }, [onChange]);

    return (
        <div className={className}>
            {label && (
                <label className={s.Input_label} htmlFor={resolvedId}>
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
                    autoFocus={autoFocus}
                    className={cx(theme.typo.t1, s.Input_input)}
                    // FIXME: NOT WORKING SINCE 5.0.3.13
                    // onInput={(e) => {
                    //     const element = e.target as HTMLInputElement;
                    //     onChange(element.value);
                    // }}
                    disabled={disabled}
                    id={resolvedId}
                    placeholder={placeholder}
                    value={value}
                    onBlur={(e) => {
                        setFocus(false);
                        onBlur?.((e.target as HTMLInputElement).value);
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
