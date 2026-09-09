// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useRef } from 'preact/hooks';

import s from './Checkbox.module.pcss';
import { CheckboxIcon } from './CheckboxIcon';

import type { ComponentChild } from 'preact';

type CheckboxProps = {
    checked: boolean;
    title?: ComponentChild;
    desc?: ComponentChild;
    className?: string;
    labelClassName?: string;
    disabled?: boolean;
    muted?: boolean;
    onChange(e: boolean): void;
    id?: string;
    /**
     * Id of the element naming this checkbox — for layouts where the label
     * text is a sibling (e.g. it contains links that must not toggle the
     * checkbox) and the input would otherwise have no accessible name.
     */
    ariaLabelledby?: string;
    withHover?: boolean;
};

/**
 * Checkbox checker
 */
export function Checkbox({
    checked,
    title,
    desc,
    className,
    labelClassName,
    disabled,
    muted,
    onChange,
    id,
    ariaLabelledby,
    withHover,
}: CheckboxProps) {
    const ref = useRef<HTMLLabelElement>(null);

    return (
        // `.Checkbox_input` below is `display: none` for `CheckboxIcon` to
        // replace it visually — same as `Radio`, that excludes the real input
        // from the accessibility tree entirely, so the role/state/reachability
        // have to live on the label that actually receives clicks and focus.
        <label
            ref={ref}
            aria-checked={checked}
            aria-disabled={disabled}
            aria-labelledby={ariaLabelledby}
            className={cx(s.Checkbox, disabled && s.Checkbox__disabled, withHover && s.Checkbox_withHover, className)}
            htmlFor={id}
            // The rule fires because a `<label>` is not natively interactive —
            // but this one is: a native `<label for>` click forwards to its
            // (hidden) input regardless of CSS visibility, and now so does a
            // VoiceOver press, since the label itself carries the role.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
            role="checkbox"
            tabIndex={0}
        >
            <input
                checked={checked}
                className={s.Checkbox_input}
                disabled={disabled}
                id={id}
                type="checkbox"
                onChange={(e) => onChange(e.currentTarget.checked)}
            />
            <div className={s.Checkbox_title}>
                <CheckboxIcon checked={checked} muted={muted} />
                {title}
            </div>
            {desc && (
                <div className={cx(s.Checkbox_desc, labelClassName)}>
                    {desc}
                </div>
            )}
        </label>
    );
}
