// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { test, beforeEach } from 'node:test';
import assert from 'node:assert';

import { UserRule } from 'Common/apis/types';

import { editorStore } from 'Modules/userrules/editorStore';

beforeEach(() => {
    editorStore.setRules([]);
});

test('loadRules sets both the load signal and the working set', () => {
    const rules = [new UserRule({ rule: '||example.com^', enabled: true })];
    editorStore.loadRules(rules);

    assert.equal(editorStore.isEmpty, false);
    assert.equal(editorStore.rules.length, 1);
    assert.equal(editorStore.loadedRules.length, 1);
});

test('setRules updates only the working set, not the load signal (no re-sync feedback)', () => {
    const loaded = [new UserRule({ rule: 'a', enabled: true })];
    editorStore.loadRules(loaded);
    const loadSignalRef = editorStore.loadedRules;
    const loadSignalLen = editorStore.loadedRules.length;

    const edited = [new UserRule({ rule: 'b', enabled: false })];
    editorStore.setRules(edited);

    // Working set updated.
    assert.equal(editorStore.rules.length, 1);
    assert.equal(editorStore.isEmpty, false);
    // Load signal unchanged (stable reference + length: setRules did not
    // touch the load signal, so the editor will not be re-synced).
    assert.equal(editorStore.loadedRules, loadSignalRef);
    assert.equal(editorStore.loadedRules.length, loadSignalLen);
});

test('setRules([]) sets isEmpty true', () => {
    editorStore.loadRules([new UserRule({ rule: 'a', enabled: true })]);
    editorStore.setRules([]);
    assert.equal(editorStore.isEmpty, true);
    assert.equal(editorStore.rules.length, 0);
    // Load signal unchanged by the editor mutation.
    assert.equal(editorStore.loadedRules.length, 1);
});
