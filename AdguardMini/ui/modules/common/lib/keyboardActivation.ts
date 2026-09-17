// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { KEYBOARD_CODES } from '@adg/webview-utils-kit';

/**
 * The part of a keyboard event the activation decision needs. Components
 * pass a real `KeyboardEvent`; unit tests pass a plain object.
 */
export type ActivationKeyEvent = {
    /** `KeyboardEvent.code` of the pressed key. */
    code: string;
    /** Whether the Alt modifier was held down. */
    altKey: boolean;
    /** Whether the press auto-repeats while the key is held. */
    repeat: boolean;
    /** Cancels the event's default action. */
    preventDefault(): void;
    /**
     * Element the press originated on. Real events always carry it; plain
     * object test doubles may omit it.
     */
    target?: unknown;
    /**
     * Element whose handler is running. Real events always carry it; plain
     * object test doubles may omit it.
     */
    currentTarget?: unknown;
    /** Stops the event from reaching enclosing handlers. */
    stopPropagation?(): void;
};

/**
 * Whether the event is a deliberate activation keypress: Enter or Space,
 * excluding `Alt+Space` (reserved by the platform for the context menu) and
 * auto-repeats of a held key.
 *
 * @param event Keyboard event to classify.
 * @returns `true` when the press should activate the focused control.
 */
export function isActivationKey(event: ActivationKeyEvent): boolean {
    if (event.repeat) {
        return false;
    }

    if (event.code === KEYBOARD_CODES.enter) {
        return true;
    }

    return event.code === KEYBOARD_CODES.space && !event.altKey;
}

/**
 * Runs `action` exactly once for an activation keypress. Space presses that
 * activate nothing (auto-repeats) still have their page scroll suppressed;
 * `Alt+Space` is left to the platform context-menu keybinding.
 *
 * @param event Keyboard event to classify.
 * @param action Action to run when the press is an activation keypress.
 * @returns `true` when the press activated the control.
 */
export function handleActivation(event: ActivationKeyEvent, action: () => void): boolean {
    if (!isActivationKey(event)) {
        if (event.code === KEYBOARD_CODES.space && !event.altKey) {
            event.preventDefault();
        }

        return false;
    }

    event.preventDefault();
    action();

    return true;
}

/**
 * Whether a keypress originated on a control nested inside the one whose
 * handler is running — a link inside a checkbox label, a Hide caption inside
 * a card, a button inside a row.
 *
 * Such a press belongs to the nested control. Activating the enclosing
 * control as well would suppress the nested control's own default action
 * (`preventDefault` is part of activation) and run a second action the user
 * never asked for. Pointer activation needs no such check: a click
 * legitimately targets nested markup, and an interactive child stops its own
 * click from reaching the wrapper.
 *
 * @param event Keyboard event to classify.
 * @returns `true` when the press came from a nested control.
 */
export function isNestedKeyEvent(event: ActivationKeyEvent): boolean {
    return event.target !== event.currentTarget;
}

/**
 * Tweaks shared by the keyboard and pointer activation paths.
 */
export type ActivationHandlerOptions = {
    /**
     * Stops the event once it activated the control, so it cannot reach an
     * enclosing activation surface (a story card, a checkbox label).
     */
    stopPropagation?: boolean;
};

/**
 * Builds the `onKeyDown` handler for a control that activates on Enter or
 * Space: nested-control presses are ignored, the action runs once, and the
 * press is stopped from bubbling when the call site asks for it.
 *
 * Use it directly when the element's role or tab stop is conditional — for
 * example a wrapper that is a button only for some rows; otherwise
 * `buttonProps` covers the whole prop set.
 *
 * @param action Action to run for the keypress.
 * @param options Event handling tweaks; see `ActivationHandlerOptions`.
 * @returns Handler to pass as `onKeyDown`.
 */
export function activateOnKeyDown(
    action: () => void,
    options: ActivationHandlerOptions = {},
): (event: ActivationKeyEvent) => void {
    return (event) => {
        if (isNestedKeyEvent(event)) {
            return;
        }

        if (handleActivation(event, action) && options.stopPropagation) {
            event.stopPropagation?.();
        }
    };
}

/**
 * Options for `buttonProps`.
 */
export type ButtonPropsOptions = ActivationHandlerOptions & {
    /**
     * Suppresses the pointer event's default action. A click inside a
     * `<label>` would otherwise activate the labeled control as well.
     */
    preventDefault?: boolean;
};

/**
 * Props that make a non-interactive element (`div`, `span`, clickable `Text`)
 * keyboard operable: the button role, the tab stop, and matching pointer and
 * keyboard paths that run `action` exactly once.
 *
 * Prefer it over hand-written `role`/`tabIndex`/`onClick`/`onKeyDown` groups:
 * the activation rules (Enter and Space only, no `Alt+Space`, no auto-repeats,
 * no activation from a nested control) then live in one place.
 *
 * @param action Action to run for pointer and keyboard activation.
 * @param options Event handling tweaks; see `ButtonPropsOptions`.
 * @returns Props to spread onto the element.
 */
export function buttonProps(action: () => void, options: ButtonPropsOptions = {}): ActivationButtonProps {
    const { preventDefault, stopPropagation } = options;

    return {
        role: 'button',
        tabIndex: 0,
        onClick: (event: ActivationPointerEvent) => {
            if (preventDefault) {
                event.preventDefault();
            }

            if (stopPropagation) {
                event.stopPropagation();
            }

            action();
        },
        onKeyDown: activateOnKeyDown(action, { stopPropagation }),
    };
}

/**
 * The part of a pointer event the activation path needs. Components pass a
 * real `MouseEvent`; unit tests pass a plain object.
 */
export type ActivationPointerEvent = {
    /** Cancels the event's default action. */
    preventDefault(): void;
    /** Stops the event from reaching enclosing handlers. */
    stopPropagation(): void;
};

/**
 * Prop set produced by `buttonProps`.
 */
export type ActivationButtonProps = {
    /** Role that presents the element as a button to assistive tech. */
    role: 'button';
    /** Tab stop, matching a native button. */
    tabIndex: number;
    /** Pointer activation path. */
    onClick(event: ActivationPointerEvent): void;
    /** Enter/Space activation path. */
    onKeyDown(event: ActivationKeyEvent): void;
};
