// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    captureFocusSnapshot,
    installFocusActivationTracker,
    resolveFocusOpenerSource,
    resolveFocusRestoreTarget,
} from '../../../modules/common/lib/focusRestore';

import type { FocusRestoreCandidate } from '../../../modules/common/lib/focusRestore';

/**
 * Builds a candidate state for the resolvers.
 *
 * @param isConnected Whether the element is attached to the document.
 * @param isVisible Whether the element renders layout boxes.
 * @returns The candidate state.
 */
function candidate(isConnected: boolean, isVisible: boolean): FocusRestoreCandidate {
    return { isConnected, isVisible };
}

test('resolveFocusRestoreTarget chooses the opener while it is usable', () => {
    assert.equal(resolveFocusRestoreTarget(candidate(true, true), null), 'opener');
    assert.equal(resolveFocusRestoreTarget(candidate(true, true), candidate(true, true)), 'opener');
});

test('resolveFocusRestoreTarget chooses the heading when the opener is missing', () => {
    assert.equal(resolveFocusRestoreTarget(null, candidate(true, true)), 'heading');
});

test('resolveFocusRestoreTarget chooses the heading when the opener is disconnected', () => {
    assert.equal(resolveFocusRestoreTarget(candidate(false, true), candidate(true, true)), 'heading');
});

test('resolveFocusRestoreTarget chooses the heading when the opener is not visible', () => {
    assert.equal(resolveFocusRestoreTarget(candidate(true, false), candidate(true, true)), 'heading');
});

test('resolveFocusRestoreTarget chooses the body when no candidate is usable', () => {
    assert.equal(resolveFocusRestoreTarget(null, null), 'body');
    assert.equal(resolveFocusRestoreTarget(null, candidate(false, false)), 'body');
    assert.equal(resolveFocusRestoreTarget(candidate(false, true), candidate(true, false)), 'body');
    assert.equal(resolveFocusRestoreTarget(candidate(true, false), null), 'body');
});

test('resolveFocusOpenerSource prefers the activation record while it is usable', () => {
    assert.equal(resolveFocusOpenerSource(candidate(true, true), candidate(true, true)), 'activation');
    assert.equal(resolveFocusOpenerSource(candidate(true, true), null), 'activation');
});

test('resolveFocusOpenerSource falls back to the active element when the record is unusable', () => {
    assert.equal(resolveFocusOpenerSource(null, candidate(true, true)), 'active');
    assert.equal(resolveFocusOpenerSource(candidate(false, true), candidate(true, true)), 'active');
    assert.equal(resolveFocusOpenerSource(candidate(true, false), candidate(true, true)), 'active');
});

test('resolveFocusOpenerSource reports no opener when neither candidate is usable', () => {
    assert.equal(resolveFocusOpenerSource(null, null), null);
    assert.equal(resolveFocusOpenerSource(candidate(false, true), candidate(true, false)), null);
    assert.equal(resolveFocusOpenerSource(candidate(true, false), null), null);
});

/**
 * Fake DOM the activation tracker and the snapshot read from. Mirrors the
 * `fakeDocument` helper of `inputModality.test.ts`.
 */
function fakeFocusDocument() {
    class FakeHTMLElement {
        public isConnected = true;

        public getClientRects(): DOMRect[] {
            return [{} as DOMRect];
        }

        public focus(): void {}
    }

    (globalThis as Record<string, unknown>).HTMLElement = FakeHTMLElement;

    const body = new FakeHTMLElement();
    const listeners: Record<string, Array<(event: unknown) => void>> = {};
    const captures: Record<string, boolean> = {};

    const fakeDocument = {
        activeElement: body as unknown,
        addEventListener: (type: string, handler: (event: unknown) => void, capture?: boolean) => {
            (listeners[type] ??= []).push(handler);
            captures[type] = Boolean(capture);
        },
        body,
        documentElement: new FakeHTMLElement(),
    };

    (globalThis as Record<string, unknown>).document = fakeDocument;

    return { FakeHTMLElement, fakeDocument, listeners, captures };
}

test('a pointer activation is recorded even when focus stays on the body', () => {
    const { FakeHTMLElement, listeners, captures } = fakeFocusDocument();

    installFocusActivationTracker();

    assert.equal(captures.click, true, 'must observe clicks in the capture phase');

    const button = new FakeHTMLElement();
    listeners.click[0]({ target: { closest: () => button } });

    assert.equal(captureFocusSnapshot().opener, button);
});

test('an Enter or Space keydown records the focused element', () => {
    const { FakeHTMLElement, fakeDocument, listeners, captures } = fakeFocusDocument();

    installFocusActivationTracker();

    assert.equal(captures.keydown, true, 'must observe keydowns in the capture phase');

    const item = new FakeHTMLElement();
    fakeDocument.activeElement = item;

    listeners.keydown[0]({ code: 'Enter', altKey: false, repeat: false, preventDefault: () => {} });

    // Move focus off the item before capturing: the active-element fallback
    // now yields nothing, so only the record written by the keydown can
    // produce `item` as the opener.
    fakeDocument.activeElement = fakeDocument.body;

    assert.equal(captureFocusSnapshot().opener, item);
});

test('an activation removed before capture no longer competes with the focused element', () => {
    const { FakeHTMLElement, listeners } = fakeFocusDocument();

    installFocusActivationTracker();

    const menuItem = new FakeHTMLElement();
    listeners.click[0]({ target: { closest: () => menuItem } });

    // The menu subtree is removed in the same commit that mounts the modal.
    menuItem.isConnected = false;

    assert.equal(captureFocusSnapshot().opener, null);
});
