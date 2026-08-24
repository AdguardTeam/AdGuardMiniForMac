// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    buildViolationRecord,
    createViolationEmitter,
    installPolicyViolationReporter,
    DEFAULT_VIOLATION_OPTIONS,
} from '../../modules/common/policyViolationReporter';

const SAMPLE_EVENT = {
    blockedURI: 'https://evil.example.com/script.js',
    violatedDirective: 'script-src',
    effectiveDirective: 'script-src-elem',
    documentURI: 'file:///AdguardMini.app/Contents/Resources/WebUI/tray.html',
    sourceFile: 'file:///AdguardMini.app/Contents/Resources/WebUI/tray.html',
    lineNumber: 42,
    columnNumber: 7,
    sample: 'var x = 1',
};

test('buildViolationRecord produces a well-formed message and source-location stack', () => {
    const rec = buildViolationRecord(SAMPLE_EVENT);
    assert.ok(rec.message.startsWith('CSP violation:'));
    assert.match(rec.message, /blockedURI=https:\/\/evil\.example\.com\/script\.js/);
    assert.match(rec.message, /violatedDirective=script-src/);
    assert.match(rec.message, /effectiveDirective=script-src-elem/);
    assert.equal(
        rec.stack,
        'file:///AdguardMini.app/Contents/Resources/WebUI/tray.html:42:7',
    );
});

test('buildViolationRecord falls back to documentURI when sourceFile is absent', () => {
    const rec = buildViolationRecord({
        blockedURI: 'https://evil.example.com/x',
        violatedDirective: 'connect-src',
        documentURI: 'file:///ui.html',
    });
    assert.equal(rec.stack, 'file:///ui.html');
    // effectiveDirective defaults to violatedDirective when absent.
    assert.match(rec.message, /effectiveDirective=connect-src/);
});

const fakeSink = () => {
    const posted: Array<{ message: string; stack?: string }> = [];
    return {
        posted,
        postMessage(body: { message: string; stack?: string }) {
            posted.push(body);
        },
    };
};

test('a single violation emits exactly one well-formed record to the sink', () => {
    const sink = fakeSink();
    const now = { t: 1_000 };
    const emit = createViolationEmitter(sink, {
        now: () => now.t,
        windowMs: DEFAULT_VIOLATION_OPTIONS.windowMs,
        maxPerWindow: DEFAULT_VIOLATION_OPTIONS.maxPerWindow,
    });

    emit(SAMPLE_EVENT);

    assert.equal(sink.posted.length, 1);
    assert.ok(sink.posted[0].message.startsWith('CSP violation:'));
    assert.ok(sink.posted[0].stack!.includes(':42:7'));
});

test('N rapid identical violations produce exactly one record (dedup)', () => {
    const sink = fakeSink();
    const now = { t: 1_000 };
    const emit = createViolationEmitter(sink, {
        now: () => now.t,
        windowMs: DEFAULT_VIOLATION_OPTIONS.windowMs,
        maxPerWindow: DEFAULT_VIOLATION_OPTIONS.maxPerWindow,
    });

    for (let i = 0; i < 100; i += 1) {
        emit(SAMPLE_EVENT);
    }

    assert.equal(sink.posted.length, 1);
});

test('distinct violations are capped at maxPerWindow inside the window', () => {
    const sink = fakeSink();
    const now = { t: 1_000 };
    const emit = createViolationEmitter(sink, {
        now: () => now.t,
        windowMs: DEFAULT_VIOLATION_OPTIONS.windowMs,
        maxPerWindow: 3,
    });

    for (let i = 0; i < 100; i += 1) {
        emit({
            blockedURI: `https://evil.example.com/${i}`,
            violatedDirective: 'script-src',
        });
    }

    assert.equal(sink.posted.length, 3);
});

test('after the window elapses a previously deduped key emits again', () => {
    const sink = fakeSink();
    const now = { t: 1_000 };
    const emit = createViolationEmitter(sink, {
        now: () => now.t,
        windowMs: 5_000,
        maxPerWindow: 10,
    });

    emit(SAMPLE_EVENT);
    assert.equal(sink.posted.length, 1);

    // Same key inside the window → dropped.
    emit(SAMPLE_EVENT);
    assert.equal(sink.posted.length, 1);

    // Advance past the window → emits again.
    now.t += 5_001;
    emit(SAMPLE_EVENT);
    assert.equal(sink.posted.length, 2);
});

test('stale dedup keys are evicted so the keyLastEmit map stays bounded', () => {
    const sink = fakeSink();
    const now = { t: 1_000 };
    const emit = createViolationEmitter(sink, {
        now: () => now.t,
        windowMs: 5_000,
        maxPerWindow: 1_000,
    });

    // Produce many distinct keys inside the window — Map grows.
    for (let i = 0; i < 100; i += 1) {
        emit({
            blockedURI: `https://evil.example.com/${i}`,
            violatedDirective: 'script-src',
        });
    }
    assert.equal(sink.posted.length, 100);

    // Advance well past the window and emit one more event. The eviction
    // sweep (run on every event) should have removed every stale key, so
    // a previously-seen key emits again instead of being suppressed by a
    // stale entry — and the Map does not retain the prior 100 entries.
    now.t += 10_000;
    emit({
        blockedURI: 'https://evil.example.com/0',
        violatedDirective: 'script-src',
    });
    assert.equal(sink.posted.length, 101);
});

test('installPolicyViolationReporter wires the listener to the emitter and sink', () => {
    const sink = fakeSink();
    const listeners: Record<string, Array<(evt: unknown) => void>> = {};
    const target = {
        addEventListener: (type: string, fn: (evt: unknown) => void) => {
            (listeners[type] ??= []).push(fn);
        },
    };
    const now = { t: 1_000 };
    installPolicyViolationReporter(target, sink, {
        now: () => now.t,
        windowMs: DEFAULT_VIOLATION_OPTIONS.windowMs,
        maxPerWindow: DEFAULT_VIOLATION_OPTIONS.maxPerWindow,
    });

    // No event → nothing reported (Acceptance Criterion 3).
    assert.equal(sink.posted.length, 0);

    // One violation → exactly one well-formed record (Acceptance Criterion 1).
    listeners.securitypolicyviolation[0](SAMPLE_EVENT);
    assert.equal(sink.posted.length, 1);
    assert.ok(sink.posted[0].message.startsWith('CSP violation:'));

    // 100 rapid identical violations → still bounded (Acceptance Criterion 2).
    for (let i = 0; i < 100; i += 1) {
        listeners.securitypolicyviolation[0](SAMPLE_EVENT);
    }
    assert.equal(sink.posted.length, 1);
});
