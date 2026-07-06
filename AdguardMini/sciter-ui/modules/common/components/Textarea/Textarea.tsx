// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useRef, useEffect, useState } from 'preact/hooks';

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
    autoFocus?: boolean;
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
    autoFocus,
    textAreaClassName,
}: TextareaProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [focus, setFocus] = useState(false);

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

    useEffect(() => {
        const handleOnInput = (e: Event) => {
            const element = e.target as HTMLInputElement;
            onChange(element.value);
        };

        const inputElement = inputRef.current;

        const handleOnFocus = () => {
            setFocus(true);
        };

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
                    ref={inputRef}
                    autoFocus={autoFocus}
                    className={cx(s.Textarea_textarea, theme.typo.t1, textAreaClassName)}
                    id={id}
                    name={id}
                    placeholder={placeholder}
                    // FIXME: NOT WORKING SINCE 5.0.3.13
                    // onChange={(e) => onChange(e.currentTarget.value)}
                    onBlur={(e) => onBlur?.(e.currentTarget.value)}
                >
                    {value}
                </textarea>
            </div>
            {errorMessage && (
                <Text className={s.Textarea_errorMessage} type="t2">
                    {errorMessage}
                </Text>
            )}
        </div>
    );
}
