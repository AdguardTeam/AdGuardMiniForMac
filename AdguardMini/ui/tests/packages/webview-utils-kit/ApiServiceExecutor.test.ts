// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';

import { ApiServiceExecutor } from '../../../packages/webview-utils-kit/src/replacements/ApiServiceExecutor';
import { PlatformRequest } from '../../../packages/webview-utils-kit/src/replacements/PlatformRequest';

/**
 * Minimal stub Protobuf Message — the real google-protobuf Message is not
 * exercised here; only `.serializeBinary()` and `.toObject()` are called.
 */
class StubRequestMessage {
    public static lastSerialized: Uint8Array | null = null;
    public serializeBinary(): Uint8Array {
        const bytes = new Uint8Array([0x01, 0x02, 0x03]);
        StubRequestMessage.lastSerialized = bytes;
        return bytes;
    }
    public toObject(): unknown {
        return { field: 'request-stub' };
    }
}

class StubResponse {
    public static fromBytes: Uint8Array | null = null;
    constructor(bytes: Uint8Array) {
        StubResponse.fromBytes = bytes;
    }
    public toObject(): unknown {
        return { echoed: StubResponse.fromBytes };
    }
}

class StubRequest extends PlatformRequest<any, any> {
    public constructor() {
        super();
        this.requestMessage = new StubRequestMessage() as unknown as any;
    }
    public get FQN(): string { return 'StubService.StubMethod'; }
    public processResponse(bytes: Uint8Array): any {
        return new StubResponse(bytes);
    }
}

// Mock the upstream-injected globals: `log` (declared in vendor/index.d.ts)
// + `window.xcallWrapper` (set by modules/common/api.ts:18 in the real runtime).
let dbgCalls: string[] = [];
let xcallWrapperCalls: { method: string; bytes: Uint8Array }[] = [];

beforeEach(() => {
    dbgCalls = [];
    xcallWrapperCalls = [];
    // The executor logs via `window.log?.dbg(...)` (not the bare global), so
    // the `log` surface must be installed ON the fake window.
    (globalThis as Record<string, unknown>).window = {
        log: {
            dbg: (...args: unknown[]) => { dbgCalls.push(args.map(String).join(' ')); },
        },
        xcallWrapper: async (_method: string, _buffer: ArrayBuffer) => {
            xcallWrapperCalls.push({
                method: _method,
                bytes: new Uint8Array(_buffer),
            });
            // Echo the input bytes so the test can assert byte-for-byte parity.
            return new Uint8Array(xcallWrapperCalls[0].bytes);
        },
    };
});

afterEach(() => {
    delete (globalThis as Record<string, unknown>).log;
    delete (globalThis as Record<string, unknown>).window;
});

test('Execute routes via window.xcallWrapper with FQN + serializeBinary().buffer', async () => {
    const api = new ApiServiceExecutor();
    const req = new StubRequest();

    const result = await api.Execute(req);

    assert.equal(xcallWrapperCalls.length, 1);
    assert.equal(xcallWrapperCalls[0].method, 'StubService.StubMethod');
    assert.deepEqual(Array.from(xcallWrapperCalls[0].bytes), [0x01, 0x02, 0x03]);
    assert.ok(result instanceof StubResponse);
    assert.deepEqual(Array.from(StubResponse.fromBytes ?? new Uint8Array()), [0x01, 0x02, 0x03]);
});

test('Execute returns the same Promise shape as the Sciter-host upstream', async () => {
    const api = new ApiServiceExecutor();
    const result = await api.Execute(new StubRequest());
    // The Promise resolves to the result of request.processResponse(responseBytes),
    // matching upstream's `r = e.processResponse(t); return r;` shape.
    assert.ok(typeof (result as any).then === 'undefined', 'Execute must resolve to the ReturnValue, not a Promise');
    assert.ok((result as any).toObject().echoed, 'processResponse must have been called with the bytes');
});

test('Execute logs request and response when loggingEnabled is true', async () => {
    const api = new ApiServiceExecutor();
    await api.Execute(new StubRequest());

    assert.ok(dbgCalls.some((s) => s.includes('Request data')), 'request log line missing');
    assert.ok(dbgCalls.some((s) => s.includes('Response data')), 'response log line missing');
});

test('Execute skips logging when loggingEnabled is false', async () => {
    class QuietRequest extends StubRequest {
        public override get loggingEnabled(): boolean { return false; }
    }
    const api = new ApiServiceExecutor();
    await api.Execute(new QuietRequest());

    assert.equal(dbgCalls.length, 0, 'no dbg calls expected when loggingEnabled is false');
});
