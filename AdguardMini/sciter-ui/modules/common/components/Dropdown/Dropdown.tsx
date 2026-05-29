// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useClickOutside, useEscape, useScrollListener } from '@adg/sciter-utils-kit';
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
    testId?: string;
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
    testId,
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
            const WINDOW_HEIGHT = window.SciterGlobal.this.box('height') as number;
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
                <label className={s.Dropdown_label} htmlFor={id}>
                    <Text type="t2">
                        {label}
                    </Text>
                </label>
            )}
            <div
                ref={dropdownRef}
                aria-label={ariaLabel}
                className={cx(
                    s.Dropdown,
                    isOpen && s.Dropdown__active,
                    disabled && s.Dropdown__disabled,
                )}
                id={testId ?? id}
                tabIndex={0}
            >
                <div
                    className={s.Dropdown_header}
                    onClick={!disabled ? toggleOptions : undefined}
                >
                    <Text className={cx(s.Dropdown_text)} lineHeight="none" type="t1">
                        {renderLabelValue()}
                    </Text>
                    <Icon className={s.Dropdown_arrow} icon="arrow_left" />
                </div>
                <ul
                    ref={optionsRef}
                    className={cx(s.Dropdown_options, isOpen && s.Dropdown_options__show)}
                    style={ulStyles}
                    tabIndex={-1}
                >
                    {itemList.map((option) => {
                        const selected = isMulti
                            ? !!currentValue.find((co) => co.value === option.value)
                            : option === currentValue;

                        return (
                            <li
                                key={option.value}
                                className={cx(s.Dropdown_option)}
                                onClick={() => {
                                    onChange(option);

                                    if (!isMulti) {
                                        setIsOpen(false);
                                    }
                                }}
                            >
                                {renderOptionLabel
                                    ? (
                                        <Text className={s.Dropdown_text} lineHeight="none" type="t1">
                                            {renderOptionLabel}
                                        </Text>
                                    ) : (
                                        <Checkbox
                                            checked={selected}
                                            onChange={() => {}}
                                        >
                                            <Text className={s.Dropdown_text} type="t1">
                                                {option.label}
                                            </Text>
                                        </Checkbox>
                                    )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    );
}
