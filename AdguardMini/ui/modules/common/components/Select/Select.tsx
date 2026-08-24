// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { KEYBOARD_CODES, useClickOutside, useEscape, useScrollListener } from '@adg/webview-utils-kit';
import { useCallback, useRef, useState } from 'preact/hooks';

import { Text, Icon } from 'UILib';

import s from './Select.module.pcss';

import type { ComponentChildren } from 'preact';
import type { JSXInternal } from 'preact/src/jsx';

/** Arrow-up code. */
const ARROW_UP = 'ArrowUp';

/** Arrow-down code. */
const ARROW_DOWN = 'ArrowDown';

/** Select option. */
export interface SelectItem<T> {
    /** Value passed to `onChange`. */
    value: T;
    /** Option label. */
    label: string;
    /** Optional icon. */
    optionIcon?: ComponentChildren;
}

/** Select props. */
interface SelectProps<T = string> {
    /** Element id and label `htmlFor`. */
    id: string;
    /** List of selectable options. */
    itemList: SelectItem<T>[];
    /** Currently selected value. */
    currentValue: T;
    /** Called with picked value. */
    onChange(val: T): void;
    /** Accessible label for the control. */
    ariaLabel?: string;
    /** Extra wrapper class name. */
    className?: string;
    /** Optional text label rendered above the field. */
    label?: string;
}

/** Single-select dropdown. */
export function Select<T,>({
    id,
    itemList,
    currentValue,
    onChange,
    ariaLabel,
    className,
    label,
}: SelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [menuStyles, setMenuStyles] = useState<JSXInternal.CSSProperties>();

    const selectRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLUListElement>(null);

    const closeOptions = useCallback(() => setIsOpen(false), []);

    /** Toggle and place menu. */
    const toggleOptions = () => {
        if (!isOpen && selectRef.current && optionsRef.current) {
            const fieldRect = selectRef.current.getBoundingClientRect();
            const optionsHeight = optionsRef.current.offsetHeight;
            const availableBottomSpace = window.innerHeight - fieldRect.bottom;

            setMenuStyles({
                top: availableBottomSpace < optionsHeight
                    ? fieldRect.top - optionsHeight
                    : fieldRect.bottom,
                left: fieldRect.left,
                width: fieldRect.width,
            });
            setActiveIndex(itemList.findIndex((item) => String(item.value) === String(currentValue)));
        }
        setIsOpen(!isOpen);
    };

    /** Select option and close. */
    const selectItem = (item: SelectItem<T>) => {
        onChange(item.value);
        setIsOpen(false);
    };

    /** Handle keyboard interaction. */
    const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.code) {
            case KEYBOARD_CODES.enter:
            case KEYBOARD_CODES.space:
                e.preventDefault();
                if (isOpen && activeIndex >= 0 && activeIndex < itemList.length) {
                    selectItem(itemList[activeIndex]);
                } else {
                    toggleOptions();
                }
                break;
            case ARROW_DOWN:
            case ARROW_UP: {
                if (!isOpen) {
                    break;
                }
                e.preventDefault();
                const shift = e.code === ARROW_DOWN ? 1 : -1;
                const total = itemList.length;
                if (total === 0) {
                    break;
                }
                setActiveIndex((prev) => {
                    // `findIndex` sets `-1` when the current value is absent;
                    // from there ArrowDown goes to the first item and ArrowUp
                    // to the last, instead of wrapping to `total - 2`.
                    if (prev < 0) {
                        return shift > 0 ? 0 : total - 1;
                    }
                    return (prev + shift + total) % total;
                });
                break;
            }
            default:
                break;
        }
    };

    useClickOutside(selectRef, closeOptions);
    useEscape(closeOptions);
    useScrollListener(selectRef, closeOptions);

    const selectedItem = itemList.find((item) => String(item.value) === String(currentValue));

    return (
        <>
            {label && (
                <label className={s.Select_label} htmlFor={id}>
                    <Text type="t2">
                        {label}
                    </Text>
                </label>
            )}
            <div
                ref={selectRef}
                aria-controls={`${id}-listbox`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={ariaLabel}
                className={cx(s.Select, isOpen && s.Select__active, className)}
                id={id}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                    e.stopPropagation();
                    toggleOptions();
                }}
                onKeyDown={handleKeyDown}
            >
                <Text className={s.Select_value} lineHeight="none" type="t1">
                    {selectedItem?.label}
                </Text>
                <Icon className={s.Select_arrow} icon="arrow_left" />
                <ul
                    ref={optionsRef}
                    className={cx(s.Select_options, isOpen && s.Select_options__show)}
                    id={`${id}-listbox`}
                    role="listbox"
                    style={menuStyles}
                    tabIndex={-1}
                >
                    {itemList.map((item, index) => {
                        const isSelected = String(item.value) === String(currentValue);
                        return (
                            <li
                                key={item.value}
                                aria-selected={isSelected}
                                className={cx(
                                    s.Select_option,
                                    isSelected && s.Select_option__selected,
                                    index === activeIndex && s.Select_option__highlighted,
                                )}
                                id={`${id}-option-${index}`}
                                role="option"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    selectItem(item);
                                }}
                                onMouseEnter={() => setActiveIndex(index)}
                            >
                                {item.optionIcon}
                                <Text className={s.Select_optionLabel} lineHeight="none" type="t1">
                                    {item.label}
                                </Text>
                                {isSelected && <Icon className={s.Select_check} icon="check" />}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    );
}
