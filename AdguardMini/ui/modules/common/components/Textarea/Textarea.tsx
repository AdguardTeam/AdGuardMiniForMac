// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState } from 'preact/hooks';

import theme from 'Theme';
import { Text } from 'UILib';

import s from './Textarea.module.pcss';

import type { ComponentChild } from 'preact';

export type TextareaProps = {
    id: string;
    label?: ComponentChild;
    placeholder?: string;
    value: string;
    onChange(e: string): void;
    onBlur?(e: string): void;
    error?: boolean;
    errorMessage?: string;
    className?: string;
    textAreaClassName?: string;
};

/**
 * Textarea component
 */
export function Textarea({
    id,
    label,
    placeholder,
    value,
    onChange,
    onBlur,
    error,
    errorMessage,
    className,
    textAreaClassName,
}: TextareaProps) {
    const [focus, setFocus] = useState(false);

    return (
        <div className={className}>
            {label && (
                <div className={s.Textarea_label}>
                    <Text className={s.Textarea_labelText} type="t2">
                        {label}
                    </Text>
                </div>
            )}
            <div
                className={cx(
                    s.Textarea_container,
                    error && s.Textarea_container__error,
                    focus && s.Textarea_container__focus,
                )}
            >
                <textarea
                    className={cx(s.Textarea_textarea, theme.typo.t1, textAreaClassName)}
                    id={id}
                    name={id}
                    placeholder={placeholder}
                    value={value}
                    onBlur={(e) => {
                        setFocus(false);
                        onBlur?.(e.currentTarget.value);
                    }}
                    onFocus={() => setFocus(true)}
                    onInput={(e) => {
                        const element = e.currentTarget as HTMLTextAreaElement;
                        onChange(element.value);
                    }}
                />
            </div>
            {errorMessage && (
                <Text className={s.Textarea_errorMessage} type="t2">
                    {errorMessage}
                </Text>
            )}
        </div>
    );
}
