// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { debouncedEditorSync } from 'Modules/userrules/lib/debouncedEditorSync';

/** How long to wait after a scheduled job's delay before asserting. Tuned to
 *  be robust against scheduler jitter without slowing the suite. */
const AWAIT_MARGIN_MS = 50;

/** Resolves after `ms`, letting pending `setTimeout` jobs fire. */
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('debouncedEditorSync', () => {
    afterEach(() => {
        debouncedEditorSync.cancel();
    });

    it('does not run the job before the debounce delay elapses', () => {
        const calls: string[] = [];
        debouncedEditorSync.schedule(() => { calls.push('a'); }, 1000);
        assert.deepEqual(calls, []);
    });

    it('runs the job after the delay elapses', async () => {
        const calls: string[] = [];
        debouncedEditorSync.schedule(() => { calls.push('a'); }, 10);
        await sleep(10 + AWAIT_MARGIN_MS);
        assert.deepEqual(calls, ['a']);
    });

    it('keeps only the trailing schedule (resets the timer)', async () => {
        const calls: string[] = [];
        debouncedEditorSync.schedule(() => { calls.push('a'); }, 10);
        debouncedEditorSync.schedule(() => { calls.push('b'); }, 10);
        await sleep(10 + AWAIT_MARGIN_MS);
        assert.deepEqual(calls, ['b']);
    });

    it('re-scheduling while pending replaces the queued job', async () => {
        const calls: string[] = [];
        debouncedEditorSync.schedule(() => { calls.push('a'); }, 10);
        debouncedEditorSync.schedule(() => { calls.push('b'); }, 1000);
        await sleep(10 + AWAIT_MARGIN_MS);
        // First job was replaced, not run and re-queued.
        assert.deepEqual(calls, []);
    });

    it('flush runs a pending job immediately', async () => {
        const calls: string[] = [];
        debouncedEditorSync.schedule(() => { calls.push('a'); }, 1000);
        debouncedEditorSync.flush();
        assert.deepEqual(calls, ['a']);
    });

    it('flush cancels the timer so the job does not run again later', async () => {
        const calls: string[] = [];
        debouncedEditorSync.schedule(() => { calls.push('a'); }, 10);
        debouncedEditorSync.flush();
        assert.deepEqual(calls, ['a']);
        await sleep(10 + AWAIT_MARGIN_MS);
        assert.deepEqual(calls, ['a']);
    });

    it('flush with nothing pending is a no-op', () => {
        assert.doesNotThrow(() => debouncedEditorSync.flush());
    });

    it('cancel drops a pending job', async () => {
        const calls: string[] = [];
        debouncedEditorSync.schedule(() => { calls.push('a'); }, 10);
        debouncedEditorSync.cancel();
        await sleep(10 + AWAIT_MARGIN_MS);
        assert.deepEqual(calls, []);
    });
});
