// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useMemo } from 'preact/hooks';

import { activateOnKeyDown } from 'Common/lib/keyboardActivation';

import type { ActivationKeyEvent } from 'Common/lib/keyboardActivation';

/**
 * The `tabIndex`/`onKeyDown` pair a toggle-control wrapper carries in place of
 * the hidden `<input>`.
 */
export type ToggleControlKeyboard = {
    /** Tab stop; a disabled control leaves the tab order like a native input. */
    tabIndex: number;
    /** Enter/Space activation; absent while the control is disabled. */
    onKeyDown?(event: ActivationKeyEvent): void;
};

/**
 * Builds the `tabIndex`/`onKeyDown` pair for a toggle control's wrapper.
 *
 * `Checkbox`, `Radio` and `Switch` hide the real `<input>` and draw their own
 * visual, so the wrapper holds the tab stop and the Enter/Space path; this
 * hook keeps those identical across the three.
 *
 * Activation ignores keypresses that came from a control nested inside the
 * wrapper (a link inside the label), runs `action` once per press, and
 * suppresses the Space page scroll — see `activateOnKeyDown`.
 *
 * @param disabled Whether the control is disabled; disabled controls get no
 * keyboard path.
 * @param action Toggle action, run for each deliberate Enter/Space press.
 * @returns Props to spread onto the wrapper element.
 */
export function useToggleControlKeyboard(
    disabled: boolean | undefined,
    action: () => void,
): ToggleControlKeyboard {
    return useMemo(() => ({
        tabIndex: disabled ? -1 : 0,
        onKeyDown: disabled ? undefined : activateOnKeyDown(action),
    }), [disabled, action]);
}
