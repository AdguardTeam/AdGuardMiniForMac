// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { KEYBOARD_CODES, useClickOutside, useEscape, useScrollListener } from '@adg/webview-utils-kit';
import { useRef, useState, useCallback } from 'preact/hooks';

import { Icon, Text, Checkbox } from 'UILib';

import s from './Dropdown.module.pcss';

import type { ComponentChild } from 'preact';
import type { JSXInternal } from 'preact/src/jsx';

export type IOption<T> = {
    value: T;
    label: string;
    optionIcon?: ComponentChild;
};

export type CustomOptionLabel<T> = { selected: boolean } & IOption<T>;

export type DropdownProps<T> = {
    id?: string;
    itemList: IOption<T>[];
    currentValue: IOption<T> | IOption<T>[];
    onChange(val: IOption<T>): void;
    ariaLabel?: string;
    label?: string;
    type?: 'border' | 'borderless';
    className?: string;
    disabled?: boolean;
    renderLabel?(option: IOption<T>): ComponentChild;
    renderOptionLabel?(props: CustomOptionLabel<T>): ComponentChild;
    renderMultiLabelValue?(options: IOption<T>[]): ComponentChild;
};

/**
 * Dropdown control
 */
export function Dropdown<T>({
    id,
    itemList,
    label,
    currentValue,
    onChange,
    ariaLabel,
    disabled,
    renderLabel = (option: IOption<T>) => option.label,
    renderOptionLabel,
    renderMultiLabelValue = (options: IOption<T>[]) => options.map((option) => option.label).join(', '),
}: DropdownProps<T>) {
    const isMulti = Array.isArray(currentValue);

    const [isOpen, setIsOpen] = useState(false);
    const [ulStyles, setUlStyles] = useState<JSXInternal.CSSProperties>();

    const dropdownRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLUListElement>(null);

    const closeDropdown = useCallback(() => setIsOpen(false), []);
    const toggleOptions = () => {
        if (dropdownRef.current && optionsRef.current) {
            const WINDOW_HEIGHT = window.innerHeight;
            let optionsStyles: JSXInternal.CSSProperties = {};
            const dropdownRect = dropdownRef.current.getBoundingClientRect();
            const optionsHeight = optionsRef.current.offsetHeight;
            const availableBottomSpace = WINDOW_HEIGHT - dropdownRect.bottom;

            optionsStyles = {
                top: (availableBottomSpace < optionsHeight
                    ? dropdownRect.top - optionsHeight : dropdownRect.bottom),
                width: dropdownRect.width,
                left: dropdownRect.left,
            };
            setUlStyles(optionsStyles);
        }
        setIsOpen(!isOpen);
    };

    useClickOutside(dropdownRef, closeDropdown);
    useEscape(closeDropdown);
    useScrollListener(dropdownRef, closeDropdown);

    const renderLabelValue = () => {
        if (isMulti) {
            if (currentValue.length === 0) {
                return translate('nothing.selected');
            }

            return <div className={s.Dropdown_multiLabel}>{renderMultiLabelValue(currentValue)}</div>;
        }

        return renderLabel(currentValue);
    };

    return (
        <>
            {label && (
                // `htmlFor` does not associate with the `<div>` below — it only
                // works on form controls — so the field is named by
                // `aria-labelledby` instead.
                <label className={s.Dropdown_label} htmlFor={id} id={`${id}-label`}>
                    <Text type="t2">
                        {label}
                    </Text>
                </label>
            )}
            <div
                ref={dropdownRef}
                className={cx(
                    s.Dropdown,
                    isOpen && s.Dropdown__active,
                    disabled && s.Dropdown__disabled,
                )}
                id={id}
            >
                {/*
                  * The role and the tab stop belong on the header, not on the
                  * wrapper: the wrapper held the tab stop while the click
                  * handler sat here, so activating the focused element did
                  * nothing — clicks bubble up, never down.
                  */}
                <div
                    aria-controls={`${id}-list`}
                    aria-disabled={disabled}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    aria-label={ariaLabel}
                    aria-labelledby={!ariaLabel && label ? `${id}-label` : undefined}
                    className={s.Dropdown_header}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onClick={!disabled ? toggleOptions : undefined}
                    onKeyDown={!disabled ? (e: KeyboardEvent) => {
                        if (e.code === KEYBOARD_CODES.enter || e.code === KEYBOARD_CODES.space) {
                            e.preventDefault();
                            toggleOptions();
                        }
                    } : undefined}
                >
                    <Text className={cx(s.Dropdown_text)} lineHeight="none" type="t1">
                        {renderLabelValue()}
                    </Text>
                    <Icon className={s.Dropdown_arrow} icon="arrow_left" />
                </div>
                {/*
                  * A list of checkboxes rather than a `listbox` of `option`s:
                  * each row already holds a real checkbox carrying its own
                  * role and checked state, and `option` may not contain
                  * focusable children. `listitem` still gives VoiceOver the
                  * position — "3 of 5" — which is what was missing.
                  *
                  * The roles are spelled out even though `ul`/`li` imply them:
                  * WebKit drops list semantics from the accessibility tree when
                  * the list is styled with `list-style: none`, which this one is.
                  */}
                <ul
                    ref={optionsRef}
                    className={cx(s.Dropdown_options, isOpen && s.Dropdown_options__show)}
                    id={`${id}-list`}
                    role="list"
                    style={ulStyles}
                    tabIndex={-1}
                >
                    {itemList.map((option) => {
                        const selected = isMulti
                            ? !!currentValue.find((co) => co.value === option.value)
                            : option === currentValue;

                        const handleChange = () => {
                            onChange(option);
                            if (!isMulti) {
                                setIsOpen(false);
                            }
                        };

                        return (
                            <li
                                key={option.value}
                                className={cx(s.Dropdown_option)}
                                role="listitem"
                                onClick={handleChange}
                            >
                                {renderOptionLabel
                                    ? (
                                        <Text className={s.Dropdown_text} lineHeight="none" type="t1">
                                            {renderOptionLabel}
                                        </Text>
                                    ) : (
                                        <Checkbox
                                            checked={selected}
                                            onChange={handleChange}
                                            title={(
                                                <Text className={s.Dropdown_text} type="t1">
                                                    {option.label}
                                                </Text>
                                            )}
                                        />      
                                    )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    );
}
