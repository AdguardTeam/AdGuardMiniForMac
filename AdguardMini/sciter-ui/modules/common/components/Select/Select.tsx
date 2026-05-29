// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { ComponentChildren } from 'preact';

import { KEYBOARD_CODES } from '@adg/sciter-utils-kit';
import { useRef, useEffect } from 'preact/hooks';

import { Text, Icon } from 'UILib';

// In case of need for change of styles, use USciter and debug there
// All wrapped elements are Sciter native and there names can not be change
import './Select.pcss';

interface SelectProps<T = string> {
    id: string;
    itemList: { value: T; label: string; optionIcon?: ComponentChildren }[];
    currentValue: T;
    onChange(val: T): void;
    ariaLabel?: string;
    className?: string;
    label?: string;
    testId?: string;
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
    testId,
}: SelectProps<T>) {
    const resolvedId = testId ?? id;
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
                <label className="select_label" htmlFor={resolvedId}>
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
                    id={resolvedId}
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
