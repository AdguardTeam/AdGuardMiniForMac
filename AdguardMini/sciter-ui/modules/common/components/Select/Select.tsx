// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { KEYBOARD_CODES, useClickOutside } from '@adg/sciter-utils-kit';
import { useRef, useEffect, useState, useCallback } from 'preact/hooks';

import { Text, Icon } from 'UILib';

// In case of need for change of styles, use USciter and debug there
// All wrapped elements are Sciter native and there names can not be change
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
    const [isOpen, setIsOpen] = useState(false);
    const closeDropdown = useCallback(() => setIsOpen(false), []);
    useClickOutside(ref, closeDropdown);
    useEffect(() => {
        const handleChange = (e: Event) => {
            if (typeof currentValue === 'number') {
                onChange(Number((e.target as HTMLSelectElement).value) as unknown as T);
            } else {
                onChange((e.target as HTMLSelectElement).value as unknown as T);
            }
            setIsOpen(false);
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
            const isSelected = String(item.value) === String(currentValue);
            return (
                <option
                    key={item.value}
                    aria-label={item.label}
                    selected={isSelected}
                    value={String(item.value)}
                >
                    {item.optionIcon}
                    <span>
                        {item.label}
                    </span>
                    {isSelected && <Icon className="select_check" icon="check" />}
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
                className={cx('select_wrapper', isOpen && 'select_wrapper__active', className)}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
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
                        setIsOpen(!isOpen);
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
