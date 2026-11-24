// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'vitest';

import { AppStoreSubscriptionInfo, AppStoreSubscriptions, AppStoreSubscriptionsMessage } from '../../modules/common/apis/types/AppStoreSubscription';
import { Account } from '../../modules/settings/store/modules/Account';

/**
 * A subscriptions response a test resolves manually.
 */
interface DeferredSubscriptionsResponse {
    promise: Promise<unknown>;
    resolve: (value: unknown) => void;
}

// One deferred per started `AccountService.GetSubscriptionsInfo` request, in call order.
let pendingSubscriptions: DeferredSubscriptionsResponse[] = [];

/**
 * Creates a promise with an external resolve, so a test controls when the
 * subscriptions response arrives.
 */
function createDeferred(): DeferredSubscriptionsResponse {
    let resolve!: (value: unknown) => void;
    const promise = new Promise<unknown>((res) => {
        resolve = res;
    });
    return { promise, resolve };
}

/**
 * Builds a distinguishable subscriptions response so assertions can tell
 * which response the store holds.
 */
function subscriptionsMessage(annualDisplayPrice: string): AppStoreSubscriptionsMessage {
    return new AppStoreSubscriptionsMessage({
        result: new AppStoreSubscriptions({
            annual: new AppStoreSubscriptionInfo({ displayPrice: annualDisplayPrice }),
        }),
    });
}

/**
 * Lets queued continuations run until every started request reached `Execute`.
 */
async function flushMicrotasks(): Promise<void> {
    await new Promise((resolve) => {
        setImmediate(resolve);
    });
}

beforeEach(() => {
    pendingSubscriptions = [];
    (globalThis as unknown as { window: Record<string, unknown> }).window =
        globalThis as unknown as Record<string, unknown>;
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: async (req: unknown) => {
            const { FQN } = req as { FQN: string };
            if (FQN === 'AccountService.GetTrialAvailableDays') {
                return { value: 0 };
            }
            assert.equal(FQN, 'AccountService.GetSubscriptionsInfo');
            const deferred = createDeferred();
            pendingSubscriptions.push(deferred);
            return deferred.promise;
        },
    };
});

afterEach(() => {
    delete (globalThis as unknown as { API?: unknown }).API;
    delete (globalThis as unknown as { window?: unknown }).window;
});

test('newer subscription response replaces an older applied response', async () => {
    const account = new Account();
    const older = subscriptionsMessage('older');
    const newer = subscriptionsMessage('newer');

    const olderCall = account.getSubscriptionsInfo();
    const newerCall = account.getSubscriptionsInfo();
    await flushMicrotasks();
    assert.equal(pendingSubscriptions.length, 2);

    pendingSubscriptions[0].resolve(older);
    const olderResult = await olderCall;
    assert.equal(olderResult, older);
    assert.equal(account.appStoreSubscriptions, older);

    pendingSubscriptions[1].resolve(newer);
    const newerResult = await newerCall;
    assert.equal(newerResult, newer);
    assert.equal(account.appStoreSubscriptions, newer);
});

test('older subscription response cannot replace a newer applied response', async () => {
    const account = new Account();
    const older = subscriptionsMessage('older');
    const newer = subscriptionsMessage('newer');

    const olderCall = account.getSubscriptionsInfo();
    const newerCall = account.getSubscriptionsInfo();
    await flushMicrotasks();
    assert.equal(pendingSubscriptions.length, 2);

    pendingSubscriptions[1].resolve(newer);
    const newerResult = await newerCall;
    assert.equal(newerResult, newer);
    assert.equal(account.appStoreSubscriptions, newer);

    pendingSubscriptions[0].resolve(older);
    const olderResult = await olderCall;
    assert.equal(olderResult, older);
    assert.equal(account.appStoreSubscriptions, newer);
});

test('pending subscription request keeps previous store value', async () => {
    const account = new Account();
    const previous = subscriptionsMessage('previous');
    const next = subscriptionsMessage('next');
    account.setSubscriptionsInfo(previous);

    const call = account.getSubscriptionsInfo();
    await flushMicrotasks();
    assert.equal(pendingSubscriptions.length, 1);
    assert.equal(account.appStoreSubscriptions, previous);

    pendingSubscriptions[0].resolve(next);
    const result = await call;
    assert.equal(result, next);
    assert.equal(account.appStoreSubscriptions, next);
});
