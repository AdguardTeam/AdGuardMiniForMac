// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    INITIAL_INPUT_MODALITY,
    INPUT_MODALITY_ATTRIBUTE,
    installInputModalityTracker,
    nextModality,
} from '../../../modules/common/lib/inputModality';

import type { InputModality } from '../../../modules/common/lib/inputModality';

test('the initial modality is pointer so no ring appears on load', () => {
    assert.equal(INITIAL_INPUT_MODALITY, 'pointer');
});

test('nextModality flips to keyboard on a key press', () => {
    assert.equal(nextModality('pointer', 'keydown'), 'keyboard');
});

test('nextModality flips to pointer on a pointer press', () => {
    assert.equal(nextModality('keyboard', 'pointerdown'), 'pointer');
});

test('nextModality keeps the current modality for unknown events', () => {
    for (const type of ['wheel', 'keyup', 'click', 'mousedown', 'scroll', '']) {
        assert.equal(nextModality('keyboard', type), 'keyboard');
        assert.equal(nextModality('pointer', type), 'pointer');
    }
});

test('nextModality reports the modality of the last known event in a sequence', () => {
    const sequence = ['wheel', 'keydown', 'keyup', 'pointerdown', 'scroll', 'keydown'];
    const final = sequence.reduce<InputModality>(nextModality, INITIAL_INPUT_MODALITY);

    assert.equal(final, 'keyboard');
});

/** Records root attribute writes and registered listeners of a fake document. */
function fakeDocument() {
    const attributes: Array<{ name: string; value: string }> = [];
    const listeners: Record<string, Array<(event: { type: string }) => void>> = {};
    const captures: Record<string, boolean> = {};

    (globalThis as Record<string, unknown>).document = {
        addEventListener: (type: string, handler: (event: { type: string }) => void, capture?: boolean) => {
            (listeners[type] ??= []).push(handler);
            captures[type] = Boolean(capture);
        },
        documentElement: {
            setAttribute: (name: string, value: string) => {
                attributes.push({ name, value });
            },
        },
    };

    return { attributes, listeners, captures };
}

test('installInputModalityTracker marks the root as pointer before any interaction', () => {
    const { attributes } = fakeDocument();

    installInputModalityTracker();

    assert.deepEqual(attributes, [{ name: INPUT_MODALITY_ATTRIBUTE, value: 'pointer' }]);
});

test('installInputModalityTracker flips the root attribute on key and pointer presses', () => {
    const { attributes, listeners } = fakeDocument();

    installInputModalityTracker();

    listeners.keydown[0]({ type: 'keydown' });
    assert.deepEqual(
        attributes[attributes.length - 1],
        { name: INPUT_MODALITY_ATTRIBUTE, value: 'keyboard' },
    );

    listeners.pointerdown[0]({ type: 'pointerdown' });
    assert.deepEqual(
        attributes[attributes.length - 1],
        { name: INPUT_MODALITY_ATTRIBUTE, value: 'pointer' },
    );
});

test('installInputModalityTracker writes the attribute only on a modality change', () => {
    const { attributes, listeners } = fakeDocument();

    installInputModalityTracker();
    listeners.keydown[0]({ type: 'keydown' });
    listeners.keydown[0]({ type: 'keydown' });
    listeners.pointerdown[0]({ type: 'pointerdown' });
    listeners.pointerdown[0]({ type: 'pointerdown' });

    // Initial `pointer`, then `keyboard`, then `pointer`.
    assert.equal(attributes.length, 3);
});

test('installInputModalityTracker observes events in the capture phase', () => {
    const { captures } = fakeDocument();

    installInputModalityTracker();

    assert.equal(captures.keydown, true);
    assert.equal(captures.pointerdown, true);
});
