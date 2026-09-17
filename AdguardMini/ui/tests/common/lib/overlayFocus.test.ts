// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    focusWasLost,
    resolveOverlayFocusPlan,
    shouldCloseOnOptionTab,
} from '../../../modules/common/lib/overlayFocus';

test('resolveOverlayFocusPlan restores the opener for Escape, actions, toggles and scrolls', () => {
    assert.equal(resolveOverlayFocusPlan('escape'), 'restore');
    assert.equal(resolveOverlayFocusPlan('action'), 'restore');
    assert.equal(resolveOverlayFocusPlan('toggle'), 'restore');
    assert.equal(resolveOverlayFocusPlan('scroll'), 'restore');
});

test('resolveOverlayFocusPlan leaves the outside press in charge of focus', () => {
    assert.equal(resolveOverlayFocusPlan('outside-pointer'), 'restore-if-lost');
});

test('resolveOverlayFocusPlan keeps focus where it went when focus leaves the overlay', () => {
    assert.equal(resolveOverlayFocusPlan('focus-leave'), 'keep');
});

test('resolveOverlayFocusPlan leaves focus alone when a hover tooltip closes', () => {
    assert.equal(resolveOverlayFocusPlan('hover'), 'keep');
});

test('shouldCloseOnOptionTab closes the list when Tab leaves it from the last option', () => {
    assert.equal(shouldCloseOnOptionTab(false, false, true), true);
    assert.equal(shouldCloseOnOptionTab(false, false, false), false);
});

test('shouldCloseOnOptionTab closes the list when Shift+Tab leaves it from the first option', () => {
    assert.equal(shouldCloseOnOptionTab(true, true, false), true);
    assert.equal(shouldCloseOnOptionTab(true, false, false), false);
});

test('shouldCloseOnOptionTab keeps the list open while Tab moves between options', () => {
    assert.equal(shouldCloseOnOptionTab(false, true, false), false);
    assert.equal(shouldCloseOnOptionTab(true, false, true), false);
});

test('shouldCloseOnOptionTab closes a single-option list in both directions', () => {
    assert.equal(shouldCloseOnOptionTab(false, true, true), true);
    assert.equal(shouldCloseOnOptionTab(true, true, true), true);
});

/**
 * Element stand-in for `focusWasLost`: an `HTMLElement` carrying the two
 * usability signals the function reads.
 */
class FakeHTMLElement {
    /** Whether the element is attached to the document. */
    public isConnected = true;

    /** Whether the element generates layout boxes. */
    public hasLayoutBoxes = true;

    /**
     * @returns One layout box while `hasLayoutBoxes`, none otherwise.
     */
    public getClientRects(): DOMRect[] {
        return this.hasLayoutBoxes ? [{} as DOMRect] : [];
    }
}

/**
 * Installs the minimal `document` and `HTMLElement` globals `focusWasLost`
 * reads.
 *
 * @param active Focused element, or `null`.
 * @param body Document body.
 * @param root Document root element.
 */
function installFakeFocusDocument(active: unknown, body: unknown, root: unknown): void {
    (globalThis as Record<string, unknown>).HTMLElement = FakeHTMLElement;
    (globalThis as Record<string, unknown>).document = {
        activeElement: active,
        body,
        documentElement: root,
    };
}

/**
 * Overlay root stand-in that contains exactly one node.
 *
 * @param member The only node the overlay contains.
 * @returns The overlay element stand-in.
 */
function fakeOverlayContaining(member: unknown): Element {
    return {
        contains: (node: unknown) => node === member,
    } as unknown as Element;
}

test('focusWasLost reports focus lost to the body, the root or nothing', () => {
    const body = {};
    const root = {};

    installFakeFocusDocument(null, body, root);
    assert.equal(focusWasLost(null), true);

    installFakeFocusDocument(body, body, root);
    assert.equal(focusWasLost(null), true);

    installFakeFocusDocument(root, body, root);
    assert.equal(focusWasLost(null), true);
});

test('focusWasLost reports focus lost when the active element is detached or unrendered', () => {
    const body = {};
    const root = {};

    const detached = new FakeHTMLElement();
    detached.isConnected = false;
    installFakeFocusDocument(detached, body, root);
    assert.equal(focusWasLost(null), true);

    const unrendered = new FakeHTMLElement();
    unrendered.hasLayoutBoxes = false;
    installFakeFocusDocument(unrendered, body, root);
    assert.equal(focusWasLost(null), true);
});

test('focusWasLost reports focus lost while it rests inside the closing overlay', () => {
    const body = {};
    const root = {};
    const option = new FakeHTMLElement();

    installFakeFocusDocument(option, body, root);
    assert.equal(focusWasLost(fakeOverlayContaining(option)), true);
});

test('focusWasLost reports focus taken by a usable control outside the overlay', () => {
    const body = {};
    const root = {};
    const input = new FakeHTMLElement();

    installFakeFocusDocument(input, body, root);
    assert.equal(focusWasLost(null), false);
    assert.equal(focusWasLost(fakeOverlayContaining({})), false);
});
