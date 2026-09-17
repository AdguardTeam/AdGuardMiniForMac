// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useToggleControlKeyboard } from 'Common/hooks/useToggleControlKeyboard';

import s from './Switch.module.pcss';

export type SwitchProps = {
    checked: boolean;
    onChange(checked: boolean): void;
    className?: string;
    labelClassName?: string;
    disabled?: boolean;
    muted?: boolean;
    id?: string;
    name?: string;
    ariaLabel?: string;
    /** Id of the element describing the switch (e.g. the settings row description). */
    ariaDescribedby?: string;
    icon?: boolean;
};

/**
 * Switches toggle the state of a single setting on or off.
 */
export function Switch({
    checked,
    className,
    labelClassName,
    disabled,
    muted,
    onChange,
    id,
    name,
    ariaLabel,
    ariaDescribedby,
    icon,
}: SwitchProps) {
    const keyboard = useToggleControlKeyboard(disabled, () => onChange(!checked));

    return (
        // The inner `<input>` is `display: none`, so it is absent from the
        // accessibility tree and the label is the only element a screen reader
        // sees. `role="switch"` + `aria-checked` is what gives it a name, a
        // kind and a state to announce.
        // The rule cannot see the Enter/Space handler: it arrives in the
        // `keyboard` spread at the end of the element.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <label
            aria-checked={checked}
            aria-describedby={ariaDescribedby}
            aria-disabled={disabled}
            aria-label={ariaLabel}
            className={cx(s.switch, disabled && s.disabledSwitch, className)}
            htmlFor={id}
            // The rule fires because a `<label>` is not natively interactive —
            // but this one is: it owns the click handler and the tab stop,
            // while the checkbox it labels is hidden.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
            role="switch"
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                    onChange(!checked);
                }
            }}
            {...keyboard}
        >
            {/* The hidden input is `display: none`, so it is absent from the
                accessibility tree; the wrapper label carries the role, name
                and state that assistive tech announces. */}
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <input
                checked={checked}
                className={cx(s.input, s.checked)}
                disabled={disabled}
                id={id}
                name={name}
                type="checkbox"
                onInput={(e) => {
                    e.stopPropagation();
                }}
            />
            {/* The visual track is presentational: its click handler only
                stops the pointer event from reaching the label's toggle a
                second time; the label owns the role, tab stop and activation. */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                jsx-a11y/no-static-element-interactions */}
            <div
                className={cx(
                    s.label,
                    icon && (checked ? s.enabled : s.disabled),
                    !icon && (checked ? s.labelEnabled : s.labelDisabled),
                    !icon && muted && s.muted,
                    s.labelTransitions,
                    labelClassName,
                )}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            />
        </label>
    );
}
