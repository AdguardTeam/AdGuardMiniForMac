// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { KEYBOARD_CODES } from '@adg/sciter-utils-kit';
import { useRef, useEffect } from 'preact/hooks';

import { Text, Icon } from 'UILib';

import './Select.pcss';

import type { ComponentChildren } from 'preact';

interface SelectProps<T = string> {
    id: string;
    itemList: { value: T; label: string; optionIcon?: ComponentChildren }[];
    currentValue: T;
    onChange(val: T): void;
    ariaLabel?: string;
    className?: string;
    label?: string;
}

/**
 * Select element, that use native Sciter select
 * FYI: it can be used as multiple, but styles are hard to change
 */
export function Select<T,>({
    id,
    itemList,
    currentValue,
    onChange,
    ariaLabel,
    className,
    label,
}: SelectProps<T>) {
    const ref = useRef<HTMLSelectElement>(null);
    useEffect(() => {
        const handleChange = (e: Event) => {
            if (typeof currentValue === 'number') {
                onChange(Number((e.target as HTMLSelectElement).value) as unknown as T);
            } else {
                onChange((e.target as HTMLSelectElement).value as unknown as T);
            }
        };
        const selectElement = ref.current;
        if (selectElement) {
            selectElement.addEventListener('change', handleChange);
            return () => {
                selectElement.removeEventListener('change', handleChange);
            };
        }
    }, [onChange, currentValue]);

    const renderItems = () => {
        return itemList.map((item) => {
            return (
                <option
                    key={item.value}
                    aria-label={item.label}
                    selected={String(item.value) === String(currentValue)}
                    value={String(item.value)}
                >
                    {item.optionIcon}
                    <span>
                        {item.label}
                    </span>
                    {String(item.value) === String(currentValue) && <Icon className="select_check" icon="check" />}
                </option>
            );
        });
    };

    return (
        <>
            {label && (
                <label className="select_label" htmlFor={id}>
                    <Text type="t2">
                        {label}
                    </Text>
                </label>
            )}
            <div
                className={cx('select_wrapper', className)}
                onClick={(e) => {
                    e.stopPropagation();
                    ref.current?.click();
                }}
            >
                <select
                    ref={ref}
                    aria-label={ariaLabel}
                    className="select_select"
                    id={id}
                    value={String(currentValue)}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                        if (e.code === KEYBOARD_CODES.enter && ref.current) {
                            ref.current.click();
                        }
                    }}
                >
                    {renderItems()}
                </select>
            </div>
        </>
    );
}
