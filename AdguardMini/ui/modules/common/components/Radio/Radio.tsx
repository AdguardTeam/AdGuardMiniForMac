// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { focusOnBody } from '@adg/webview-utils-kit';

import { useToggleControlKeyboard } from 'Common/hooks/useToggleControlKeyboard';
import { Icon } from 'UILib';

import s from './Radio.module.pcss';

import type { ComponentChildren } from 'preact';

type RadioProps = {
    children?: ComponentChildren;
    checked: boolean;
    className?: string;
    labelClassName?: string;
    disabled?: boolean;
    muted?: boolean;
    id?: string;
    name?: string;
    /**
     * Selection action, run by both the pointer and keyboard paths. Call
     * sites ignore the click event, so it is not part of the contract and
     * the keyboard path can run it without fabricating a mouse event.
     */
    onClick?(): void;
};

/**
 * Radio component
 */
export function Radio({
    checked,
    children,
    className,
    labelClassName,
    disabled,
    muted,
    id,
    name,
    onClick,
}: RadioProps) {
    /** Runs the selection action. */
    const select = () => {
        onClick?.();
    };

    /** Pointer path: clears the browser focus ring a mouse click would leave. */
    const handleClick = (e: MouseEvent) => {
        if (disabled) {
            return;
        }

        e.preventDefault();
        focusOnBody();
        select();
    };

    // Keyboard selection does not call `focusOnBody`: it is the click path's
    // focus reset and would blur the chosen radio.
    const keyboard = useToggleControlKeyboard(disabled, select);

    return (
        // `.Radio_input` below is `display: none` for the custom `Icon`
        // handler to replace it visually — but a `display: none` element is
        // excluded from the accessibility tree entirely, so without a role on
        // this wrapper the whole control was invisible to VoiceOver: no name,
        // no "radio button" role, no checked/unchecked state, nothing.
        // The rule cannot see the Enter/Space handler: it arrives in the
        // `keyboard` spread at the end of the element.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <label
            aria-checked={checked}
            aria-disabled={disabled}
            className={cx(s.Radio, className)}
            htmlFor={id}
            // The rule fires because a `<label>` is not natively interactive —
            // but this one is: it owns the click handler and the tab stop,
            // while the actual radio input it labels is hidden (see above).
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
            role="radio"
            onClick={onClick ? handleClick : focusOnBody}
            {...keyboard}
        >
            {/* The hidden input is `display: none`, so it is absent from the
                accessibility tree; the wrapper label carries the role, name
                and state that assistive tech announces. */}
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <input
                checked={checked}
                className={s.Radio_input}
                disabled={disabled}
                id={id}
                name={name}
                type="radio"
            />
            <Icon className={cx(s.Radio_handler, checked && !muted && s.Radio_handler__checked)} icon={checked ? 'radioChecked' : 'radioUnchecked'} />
            {children && (
                <div className={cx(s.Radio_label, disabled && s.Radio_label__disabled, labelClassName)}>
                    {children}
                </div>
            )}
        </label>
    );
}
