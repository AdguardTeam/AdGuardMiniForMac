// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveBackTransition, resolveStoryEntryFrame } from '../../modules/tray/modules/stories/utils/navigationBoundary';

test('resolveBackTransition returns frame for non-first frame', () => {
    assert.equal(resolveBackTransition(2, true), 'frame');
});

test('resolveBackTransition returns story on first frame when previous story exists', () => {
    assert.equal(resolveBackTransition(0, true), 'story');
});

test('resolveBackTransition returns none on first frame without previous story', () => {
    assert.equal(resolveBackTransition(0, false), 'none');
});

test('resolveStoryEntryFrame returns first frame index for forward entry', () => {
    assert.equal(resolveStoryEntryFrame(5, 'first'), 0);
});

test('resolveStoryEntryFrame returns last frame index for backward entry', () => {
    assert.equal(resolveStoryEntryFrame(5, 'last'), 4);
});

test('resolveStoryEntryFrame clamps for empty story', () => {
    assert.equal(resolveStoryEntryFrame(0, 'last'), 0);
});