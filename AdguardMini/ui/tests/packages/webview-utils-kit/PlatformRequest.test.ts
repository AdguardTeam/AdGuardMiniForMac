// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PlatformRequest } from '../../../packages/webview-utils-kit/src/replacements/PlatformRequest';
import type { Message as ProtobufMessage } from 'google-protobuf';

/**
 * Minimal concrete subclass for testing the abstract base.
 */
class TestRequest extends PlatformRequest<ProtobufMessage, ProtobufMessage> {
    public constructor() {
        super();
        this.requestMessage = {} as ProtobufMessage;
    }
    public get FQN() { return 'TestService.TestMethod'; }
    public processResponse(_bytes: Uint8Array): ProtobufMessage {
        return {} as ProtobufMessage;
    }
}

test('getRequestMessage throws when requestMessage is unset', () => {
    class EmptyRequest extends PlatformRequest<any, any> {
        public get FQN() { return 'Srv.M'; }
        public processResponse(_b: Uint8Array): any { return null; }
    }
    const r = new EmptyRequest();
    assert.throws(() => r.getRequestMessage(), /Request message is not initialized/);
});

test('getRequestMessage returns the set value', () => {
    const r = new TestRequest();
    const msg = r.getRequestMessage();
    assert.ok(typeof msg === 'object');
});

test('loggingEnabled defaults to true', () => {
    const r = new TestRequest();
    assert.equal(r.loggingEnabled, true);
});

test('FQN returns the declared fully-qualified method name', () => {
    const r = new TestRequest();
    assert.equal(r.FQN, 'TestService.TestMethod');
});
