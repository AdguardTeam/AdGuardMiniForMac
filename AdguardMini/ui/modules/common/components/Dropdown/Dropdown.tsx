// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useRef, useState } from 'preact/hooks';

import { useOverlay } from 'Common/hooks/useOverlay';
import { activateOnKeyDown } from 'Common/lib/keyboardActivation';
import { shouldCloseOnOptionTab } from 'Common/lib/overlayFocus';
import { Icon, Text, Checkbox } from 'UILib';

import s from './Dropdown.module.pcss';

import type { ComponentChild } from 'preact';
import type { JSXInternal } from 'preact/src/jsx';

/**
 * `KeyboardEvent.code` of the Tab key. The kit's `KEYBOARD_CODES` does not
 * list it.
 */
const TAB = 'Tab';

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

    const [ulStyles, setUlStyles] = useState<JSXInternal.CSSProperties>();

    const dropdownRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLUListElement>(null);

    // Placement is the only overlay concern left here: the open state, the
    // close paths (outside press, Escape, scroll) and the focus bookkeeping
    // they share all come from `useOverlay`.
    const { isOpen, close, toggle } = useOverlay(dropdownRef, {
        closeOnScroll: true,
        onOpen: () => {
            if (!dropdownRef.current || !optionsRef.current) {
                return;
            }

            const dropdownRect = dropdownRef.current.getBoundingClientRect();
            const optionsHeight = optionsRef.current.offsetHeight;
            const availableBottomSpace = window.innerHeight - dropdownRect.bottom;

            setUlStyles({
                top: (availableBottomSpace < optionsHeight
                    ? dropdownRect.top - optionsHeight : dropdownRect.bottom),
                width: dropdownRect.width,
                left: dropdownRect.left,
            });
        },
    });

    // While the list is open, focus leaving it closes it. `focusin` is read
    // instead of `focusout`+`relatedTarget` because it reports the element
    // that actually received focus after WebKit has settled it, and the body
    // exclusion keeps clicks on non-focusable option padding (and focus
    // falling off the page) from closing the list. The Tab keydown makes the
    // two list-edge exits deterministic: Tab past the last option (which may
    // land on browser chrome, where no `focusin` fires) and Shift+Tab off the
    // first option (which lands on the header, inside the dropdown root,
    // where the `focusin` rule must not close by itself).
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleFocusIn = (event: FocusEvent) => {
            const dropdown = dropdownRef.current;
            const target = event.target;

            if (dropdown === null || !(target instanceof Node)) {
                return;
            }

            // Focus on the body/root means the page lost focus rather than a
            // control receiving it (for example, a click on option padding).
            if (target === document.body || target === document.documentElement) {
                return;
            }

            if (!dropdown.contains(target)) {
                close('focus-leave');
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code !== TAB) {
                return;
            }

            const active = document.activeElement;
            const options = optionsRef.current;

            if (!(active instanceof HTMLElement) || options === null || !options.contains(active)) {
                return;
            }

            const option = active.closest('li');

            if (option === null) {
                return;
            }

            const closes = shouldCloseOnOptionTab(
                event.shiftKey,
                option === options.firstElementChild,
                option === options.lastElementChild,
            );

            if (closes) {
                close('focus-leave');
            }
        };

        document.addEventListener('focusin', handleFocusIn, true);
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('focusin', handleFocusIn, true);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen, close]);

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
                    onClick={!disabled ? toggle : undefined}
                    onKeyDown={!disabled ? activateOnKeyDown(toggle) : undefined}
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
                                close('action');
                            }
                        };

                        return (
                            // The option row is not focusable: the Checkbox
                            // inside is the tab stop and runs the same
                            // `handleChange`; the row click only covers the
                            // padding around it.
                            /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                jsx-a11y/no-noninteractive-element-interactions */
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
