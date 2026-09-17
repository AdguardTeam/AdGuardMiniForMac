// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { activateOnKeyDown, buttonProps, handleActivation, isActivationKey, isNestedKeyEvent } from '../../../modules/common/lib/keyboardActivation';

import type { ActivationKeyEvent, ActivationPointerEvent } from '../../../modules/common/lib/keyboardActivation';

/**
 * Builds a fake activation event and counts the default-action and
 * propagation calls it receives.
 *
 * @param code `KeyboardEvent.code` value.
 * @param options Modifier flags and whether the press came from a nested control.
 * @returns The fake event, a getter for the `preventDefault` call count and
 * one for the `stopPropagation` call count.
 */
function fakeKeyEvent(code: string, options: { altKey?: boolean; repeat?: boolean; nested?: boolean } = {}) {
    let preventDefaultCalls = 0;
    let stopPropagationCalls = 0;
    const target = {};
    const event: ActivationKeyEvent = {
        code,
        altKey: options.altKey ?? false,
        repeat: options.repeat ?? false,
        target,
        currentTarget: options.nested ? {} : target,
        preventDefault: () => {
            preventDefaultCalls += 1;
        },
        stopPropagation: () => {
            stopPropagationCalls += 1;
        },
    };

    return {
        event,
        preventDefaultCalls: () => preventDefaultCalls,
        stopPropagationCalls: () => stopPropagationCalls,
    };
}

/**
 * Builds a fake pointer event and counts the default-action and propagation
 * calls it receives.
 *
 * @returns The fake event and getters for both call counts.
 */
function fakePointerEvent() {
    let preventDefaultCalls = 0;
    let stopPropagationCalls = 0;
    const event: ActivationPointerEvent = {
        preventDefault: () => {
            preventDefaultCalls += 1;
        },
        stopPropagation: () => {
            stopPropagationCalls += 1;
        },
    };

    return {
        event,
        preventDefaultCalls: () => preventDefaultCalls,
        stopPropagationCalls: () => stopPropagationCalls,
    };
}

test('isActivationKey accepts Enter and Space', () => {
    assert.equal(isActivationKey(fakeKeyEvent('Enter').event), true);
    assert.equal(isActivationKey(fakeKeyEvent('Space').event), true);
});

test('isActivationKey rejects Alt+Space', () => {
    assert.equal(isActivationKey(fakeKeyEvent('Space', { altKey: true }).event), false);
});

test('isActivationKey ignores auto-repeats of a held key', () => {
    assert.equal(isActivationKey(fakeKeyEvent('Enter', { repeat: true }).event), false);
    assert.equal(isActivationKey(fakeKeyEvent('Space', { repeat: true }).event), false);
});

test('isActivationKey rejects unrelated keys', () => {
    for (const code of ['Tab', 'Escape', 'ArrowDown', 'KeyA', 'Backspace']) {
        assert.equal(isActivationKey(fakeKeyEvent(code).event), false);
    }
});

test('handleActivation runs the action exactly once and cancels the default action', () => {
    for (const code of ['Enter', 'Space']) {
        const { event, preventDefaultCalls } = fakeKeyEvent(code);
        let calls = 0;

        const handled = handleActivation(event, () => {
            calls += 1;
        });

        assert.equal(handled, true);
        assert.equal(calls, 1);
        assert.equal(preventDefaultCalls(), 1);
    }
});

test('handleActivation does not act on Alt+Space or unrelated keys', () => {
    for (const { event, preventDefaultCalls } of [
        fakeKeyEvent('Space', { altKey: true }),
        fakeKeyEvent('Escape'),
        fakeKeyEvent('KeyA'),
    ]) {
        let calls = 0;

        const handled = handleActivation(event, () => {
            calls += 1;
        });

        assert.equal(handled, false);
        assert.equal(calls, 0);
        assert.equal(preventDefaultCalls(), 0);
    }
});

test('handleActivation suppresses Space scrolling while ignoring auto-repeats', () => {
    const { event, preventDefaultCalls } = fakeKeyEvent('Space', { repeat: true });
    let calls = 0;

    const handled = handleActivation(event, () => {
        calls += 1;
    });

    assert.equal(handled, false);
    assert.equal(calls, 0);
    assert.equal(preventDefaultCalls(), 1);
});

test('handleActivation ignores a repeated Enter without side effects', () => {
    const { event, preventDefaultCalls } = fakeKeyEvent('Enter', { repeat: true });
    let calls = 0;

    handleActivation(event, () => {
        calls += 1;
    });

    assert.equal(calls, 0);
    assert.equal(preventDefaultCalls(), 0);
});

test('isNestedKeyEvent flags a press from a control inside the handler element', () => {
    assert.equal(isNestedKeyEvent(fakeKeyEvent('Enter').event), false);
    assert.equal(isNestedKeyEvent(fakeKeyEvent('Space').event), false);
    assert.equal(isNestedKeyEvent(fakeKeyEvent('Enter', { nested: true }).event), true);
});

test('activateOnKeyDown ignores presses that belong to a nested control', () => {
    let calls = 0;

    activateOnKeyDown(() => {
        calls += 1;
    })(fakeKeyEvent('Enter', { nested: true }).event);

    assert.equal(calls, 0);
});

test('activateOnKeyDown activates once and leaves the press in place by default', () => {
    const { event, preventDefaultCalls, stopPropagationCalls } = fakeKeyEvent('Space');
    let calls = 0;

    activateOnKeyDown(() => {
        calls += 1;
    })(event);

    assert.equal(calls, 1);
    assert.equal(preventDefaultCalls(), 1);
    assert.equal(stopPropagationCalls(), 0);
});

test('activateOnKeyDown stops the press before an enclosing control when asked', () => {
    const { event, stopPropagationCalls } = fakeKeyEvent('Enter');
    let calls = 0;

    activateOnKeyDown(() => {
        calls += 1;
    }, { stopPropagation: true })(event);

    assert.equal(calls, 1);
    assert.equal(stopPropagationCalls(), 1);
});

test('buttonProps describes a tab stop with matching pointer and keyboard paths', () => {
    let calls = 0;
    const props = buttonProps(() => {
        calls += 1;
    });
    const pointer = fakePointerEvent();

    props.onClick(pointer.event);
    props.onKeyDown(fakeKeyEvent('Enter').event);

    assert.equal(props.role, 'button');
    assert.equal(props.tabIndex, 0);
    assert.equal(calls, 2);
    assert.equal(pointer.preventDefaultCalls(), 0);
    assert.equal(pointer.stopPropagationCalls(), 0);
});

test('buttonProps runs the pointer action once and can suppress the event', () => {
    let calls = 0;
    const pointer = fakePointerEvent();
    const props = buttonProps(() => {
        calls += 1;
    }, { preventDefault: true, stopPropagation: true });

    props.onClick(pointer.event);

    assert.equal(calls, 1);
    assert.equal(pointer.preventDefaultCalls(), 1);
    assert.equal(pointer.stopPropagationCalls(), 1);
});

test('buttonProps ignores a nested press but still stops its own', () => {
    const nested = fakeKeyEvent('Space', { nested: true });
    let calls = 0;
    const props = buttonProps(() => {
        calls += 1;
    }, { stopPropagation: true });

    props.onKeyDown(nested.event);

    assert.equal(calls, 0);
    assert.equal(nested.preventDefaultCalls(), 0);
    assert.equal(nested.stopPropagationCalls(), 0);
});
