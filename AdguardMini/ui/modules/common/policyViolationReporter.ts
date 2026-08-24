// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/** Report CSP violations. */

/** Violation sink. */
export interface PolicyViolationSink {
    postMessage(body: { message: string; stack?: string }): void;
}

/** `SecurityPolicyViolationEvent` subset. */
export interface PolicyViolationEventLike {
    blockedURI?: string;
    violatedDirective?: string;
    effectiveDirective?: string;
    documentURI?: string;
    sourceFile?: string;
    lineNumber?: number;
    columnNumber?: number;
    sample?: string;
}

/** Violation record. */
export interface PolicyViolationRecord {
    message: string;
    stack: string;
}

/** Bounded-emitter options. */
export interface BoundedEmitterOptions {
    /** Monotonic clock (ms). */
    now(): number;
    /** Dedup/cap window (ms). */
    windowMs: number;
    /** Max records/window. */
    maxPerWindow: number;
}

/** Default bounds: 5s window, max 10 records. */
export const DEFAULT_VIOLATION_OPTIONS: BoundedEmitterOptions = {
    // `performance.now()` is monotonic (per the documented contract), so a
    // wall-clock jump (NTP sync, manual change, DST) cannot pin the window
    // open or close it early. Available in WKWebView and `node:test`.
    now: () => performance.now(),
    windowMs: 5_000,
    maxPerWindow: 10,
};

/** Build violation record. */
export function buildViolationRecord(event: PolicyViolationEventLike): PolicyViolationRecord {
    const blockedURI = event.blockedURI ?? '';
    const violatedDirective = event.violatedDirective ?? '';
    const effectiveDirective = event.effectiveDirective ?? '';
    const message = [
        'CSP violation:',
        `blockedURI=${blockedURI}`,
        `violatedDirective=${violatedDirective}`,
        `effectiveDirective=${effectiveDirective.length > 0 ? effectiveDirective : violatedDirective}`,
    ].join(' ');
    return { message, stack: sourceLocation(event) };
}

/** Render violation source location. */
function sourceLocation(event: PolicyViolationEventLike): string {
    const file = event.sourceFile ?? '';
    const fallback = event.documentURI ?? '';
    const filePart = file.length > 0 ? file : fallback;
    if (filePart.length === 0) {
        return '';
    }
    const line = event.lineNumber;
    const col = event.columnNumber;
    if (line !== undefined && col !== undefined) {
        return `${filePart}:${line}:${col}`;
    }
    if (line !== undefined) {
        return `${filePart}:${line}`;
    }
    return filePart;
}

/** Build dedup key. */
function violationKey(event: PolicyViolationEventLike): string {
    return JSON.stringify([event.blockedURI ?? '', event.violatedDirective ?? '']);
}

/** Create bounded violation emitter. */
export function createViolationEmitter(
    sink: PolicyViolationSink,
    opts: BoundedEmitterOptions,
): (event: PolicyViolationEventLike) => void {
    const emitTimes: number[] = [];
    const keyLastEmit = new Map<string, number>();

    return (event: PolicyViolationEventLike): void => {
        const now = opts.now();

        // Slide window and drop old timestamps.
        while (emitTimes.length > 0 && emitTimes[0] + opts.windowMs <= now) {
            emitTimes.shift();
        }

        // Evict stale dedup keys.
        if (keyLastEmit.size > 0) {
            for (const [k, t] of keyLastEmit) {
                if (now - t >= opts.windowMs) {
                    keyLastEmit.delete(k);
                }
            }
        }

        // Dedup identical key in window.
        const key = violationKey(event);
        const last = keyLastEmit.get(key);
        if (last !== undefined && now - last < opts.windowMs) {
            return;
        }

        // Cap distinct violations per window.
        if (emitTimes.length >= opts.maxPerWindow) {
            return;
        }

        const record = buildViolationRecord(event);
        try {
            sink.postMessage({ message: record.message, stack: record.stack });
        } catch {
            // Reporting must not break caller.
        }
        emitTimes.push(now);
        keyLastEmit.set(key, now);
    };
}

/** Install bounded `securitypolicyviolation` listener. */
export function installPolicyViolationReporter(
    target: { addEventListener(type: string, fn: (evt: unknown) => void): void },
    sink: PolicyViolationSink,
    opts: BoundedEmitterOptions = DEFAULT_VIOLATION_OPTIONS,
): void {
    const emit = createViolationEmitter(sink, opts);
    target.addEventListener('securitypolicyviolation', (evt) => {
        emit(evt as PolicyViolationEventLike);
    });
}
