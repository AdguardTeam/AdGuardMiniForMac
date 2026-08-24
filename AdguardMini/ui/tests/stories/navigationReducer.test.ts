// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { StoryNavigation } from '../../modules/tray/modules/stories/classes';
import { actions, navigationReducer } from '../../modules/tray/modules/stories/reducers';

import type { StoryViewConfig } from '../../modules/tray/modules/stories/model';

// The reducer calls `log.error` when a frame id does not resolve.
(globalThis as Record<string, unknown>).log = {
    error: () => {},
};

/**
 * Builds a linear test story with one frame per given id.
 *
 * @param frameIds Frame ids in order
 * @returns Story view config
 */
function buildStory(frameIds: string[]): StoryViewConfig {
    return {
        id: 'test',
        backgroundColor: 'aqua',
        frames: frameIds.map((frameId) => ({ frameId })),
    };
}

test('NEXT advances one frame and records the departing frame in history', () => {
    let nav = new StoryNavigation(buildStory(['a', 'b', 'c']));
    nav = navigationReducer(nav, actions.next());
    assert.equal(nav.currentFrameIndex, 1);
    assert.deepEqual(nav.history, [0]);
    nav = navigationReducer(nav, actions.next());
    assert.equal(nav.currentFrameIndex, 2);
    assert.deepEqual(nav.history, [0, 1]);
});

test('PREV pops history back to the frame the user came from', () => {
    let nav = new StoryNavigation(buildStory(['a', 'b', 'c']));
    nav = navigationReducer(nav, actions.next()); // a -> b (history [0])
    nav = navigationReducer(nav, actions.next()); // b -> c (history [0, 1])
    nav = navigationReducer(nav, actions.prev()); // c -> b
    assert.equal(nav.currentFrameIndex, 1);
    assert.deepEqual(nav.history, [0]);
    nav = navigationReducer(nav, actions.prev()); // b -> a
    assert.equal(nav.currentFrameIndex, 0);
    assert.deepEqual(nav.history, []);
});

test('PREV with empty history falls back to the previous linear frame', () => {
    let nav = new StoryNavigation(buildStory(['a', 'b', 'c']));
    nav.setIndex(2);
    nav = navigationReducer(nav, actions.prev());
    assert.equal(nav.currentFrameIndex, 1);
    assert.deepEqual(nav.history, []);
});

test('PREV at the first frame with empty history stays at the first frame', () => {
    const nav = new StoryNavigation(buildStory(['a', 'b', 'c']));
    const result = navigationReducer(nav, actions.prev());
    assert.equal(result.currentFrameIndex, 0);
});

test('SET_FRAME_BY_ID jumps to a non-linear frame and records history', () => {
    let nav = new StoryNavigation(buildStory(['a', 'b', 'c', 'd']));
    nav = navigationReducer(nav, actions.setFrameById('d'));
    assert.equal(nav.currentFrameIndex, 3);
    assert.deepEqual(nav.history, [0]);
    nav = navigationReducer(nav, actions.prev());
    assert.equal(nav.currentFrameIndex, 0);
});

test('SET_FRAME_BY_ID with an unknown id is a no-op and logs an error', () => {
    let logged = '';
    (globalThis as Record<string, unknown>).log = { error: (msg: string) => { logged = msg; } };
    const nav = new StoryNavigation(buildStory(['a', 'b']));
    const result = navigationReducer(nav, actions.setFrameById('missing'));
    assert.equal(result.currentFrameIndex, 0);
    assert.deepEqual(result.history, []);
    assert.match(logged, /missing/);
});

test('SET_FRAME_BY_ID to the current frame is a no-op without history push', () => {
    const nav = new StoryNavigation(buildStory(['a', 'b']));
    const result = navigationReducer(nav, actions.setFrameById('a'));
    assert.equal(result.currentFrameIndex, 0);
    assert.deepEqual(result.history, []);
});

test('SET_INDEX jumps and records the departing frame in history', () => {
    let nav = new StoryNavigation(buildStory(['a', 'b', 'c']));
    nav = navigationReducer(nav, actions.setIndex(2));
    assert.equal(nav.currentFrameIndex, 2);
    assert.deepEqual(nav.history, [0]);
    nav = navigationReducer(nav, actions.prev());
    assert.equal(nav.currentFrameIndex, 0);
});

test('SET_INDEX clamps out-of-range indices', () => {
    let nav = new StoryNavigation(buildStory(['a', 'b', 'c']));
    nav = navigationReducer(nav, actions.setIndex(-5));
    assert.equal(nav.currentFrameIndex, 0);
    nav = new StoryNavigation(buildStory(['a', 'b', 'c']));
    nav = navigationReducer(nav, actions.setIndex(99));
    assert.equal(nav.currentFrameIndex, 2);
});

test('RESET_FIRST_FRAME clears navigation and history', () => {
    let nav = new StoryNavigation(buildStory(['a', 'b']));
    nav = navigationReducer(nav, actions.next());
    nav = navigationReducer(nav, actions.resetFirstFrame());
    assert.equal(nav.currentFrameIndex, 0);
    assert.deepEqual(nav.history, []);
    assert.equal(nav.isFirstFrameReturnedBack, false);
});
