// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';

import {
    RequestUpdateURLFilterProtectionLevelRequest,
} from 'Apis/requests/AdvancedBlockingService';
import {
    OptionalError,
    URLFilterInfo,
    URLFilterProtectionLevel,
    URLFilterState,
    URLFilterStatus,
} from 'Apis/types';
import {
    DEFAULT_NOTIFY_LIFETIME,
    NotificationContext,
    NotificationsQueue,
    NotificationsQueueIconType,
    NotificationsQueueType,
} from 'Common/stores/NotificationsQueue';

import {
    AdvancedBlocking,
    URL_FILTER_INFO_FALLBACK_TIMEOUT_MS,
} from 'Modules/settings/store/modules/AdvancedBlocking';

beforeEach(() => {
    (globalThis as unknown as { window: Record<string, unknown> }).window =
        globalThis as unknown as Record<string, unknown>;
    // The error path calls the ambient `translate` global.
    (globalThis as unknown as Record<string, unknown>).translate = (key: string) => key;
});

afterEach(() => {
    delete (globalThis as unknown as { API?: unknown }).API;
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { translate?: unknown }).translate;
});

/**
 * Failure flags per System-wide Protection call and the state the pull
 * returns.
 */
type AdvancedBlockingApiOptions = {
    levelUpdateFails?: boolean;
    enabledUpdateFails?: boolean;
    cacheResetFails?: boolean;
    removalFails?: boolean;
    pulledState?: URLFilterState;
};

/**
 * Installs an `API.Execute` stub for the System-wide Protection flow and
 * collects the dispatched requests.
 *
 * @param options Failure flags per call and the state the pull returns. The
 * flags are read per request, so a case can change them between calls.
 */
function installAdvancedBlockingApi(options: AdvancedBlockingApiOptions = {}) {
    const calls: unknown[] = [];
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: (req: unknown) => {
            calls.push(req);
            const fqn = (req as { FQN: string }).FQN;
            switch (fqn) {
                case 'AdvancedBlockingService.RequestUpdateURLFilterProtectionLevel':
                    return Promise.resolve(new OptionalError({ hasError: options.levelUpdateFails ?? false }));
                case 'AdvancedBlockingService.SetURLFilterEnabled':
                    return Promise.resolve(new OptionalError({ hasError: options.enabledUpdateFails ?? false }));
                case 'AdvancedBlockingService.ResetURLFilterCache':
                    return Promise.resolve(new OptionalError({ hasError: options.cacheResetFails ?? false }));
                case 'AdvancedBlockingService.RemoveURLFilter':
                    return Promise.resolve(new OptionalError({ hasError: options.removalFails ?? false }));
                case 'AdvancedBlockingService.GetURLFilterState':
                    return Promise.resolve(options.pulledState ?? new URLFilterState());
                default:
                    throw new Error(`Unexpected request: ${fqn}`);
            }
        },
    };

    return calls;
}

/**
 * Builds a URL filter state callback payload.
 *
 * @param protectionLevel Level reported by the platform.
 * @param info Filtering rules stats reported by the platform.
 */
function makePush(protectionLevel: URLFilterProtectionLevel, info?: URLFilterInfo): URLFilterState {
    return new URLFilterState({
        enabled: true,
        protectionLevel,
        info,
    });
}

/**
 * Builds the state the platform reports for a failed enable.
 */
function makeErrorState(): URLFilterState {
    return new URLFilterState({
        enabled: false,
        protectionLevel: URLFilterProtectionLevel.essential,
        status: URLFilterStatus.error,
        info: new URLFilterInfo({}),
    });
}

/**
 * Builds the state the platform reports while the filter runs.
 */
function makeRunningState(): URLFilterState {
    return new URLFilterState({
        enabled: true,
        protectionLevel: URLFilterProtectionLevel.essential,
        status: URLFilterStatus.running,
        info: new URLFilterInfo({}),
    });
}

/**
 * Drops the shown notification the way a foreign one does: through
 * `closeOthers`, which clears the queue without calling `onClose`.
 *
 * @param queue Queue to clear.
 */
function dropWithForeignNotification(queue: NotificationsQueue) {
    queue.notify({
        message: 'other',
        notificationContext: NotificationContext.info,
        type: NotificationsQueueType.warning,
        iconType: NotificationsQueueIconType.error,
    }, true);
}

/**
 * Ids of the notifications currently queued, in insertion order.
 *
 * @param queue Queue to read.
 */
function notificationIds(queue: NotificationsQueue): string[] {
    return queue.mapQueue((_, uid) => uid);
}

/**
 * Creates a store whose stats for the given level were pulled from the
 * platform, as the settings module does on open.
 *
 * @param level Protection level the stats belong to.
 * @param stats Stats currently displayed to the user.
 */
async function makeStoreShowing(
    level: URLFilterProtectionLevel,
    stats: URLFilterInfo,
): Promise<AdvancedBlocking> {
    installAdvancedBlockingApi({
        pulledState: new URLFilterState({ enabled: true, protectionLevel: level, info: stats }),
    });
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue());
    await advancedBlocking.getURLFilterState();

    return advancedBlocking;
}

/**
 * Behavioral tests for the settings `AdvancedBlocking` store.
 *
 * Every case enables virtual timers: the store arms its hold fallback with
 * `setTimeout`, and a hold left armed at the end of a case would otherwise
 * keep that real timer — and the test runner — alive for its full duration.
 */
test('updateSystemWideProtectionLevel applies the level optimistically and relies on the push for the fresh count', async (t) => {
    t.mock.timers.enable();
    const calls: unknown[] = [];
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: (req: unknown) => {
            calls.push(req);
            const fqn = (req as { FQN: string }).FQN;
            if (fqn === 'AdvancedBlockingService.RequestUpdateURLFilterProtectionLevel') {
                return Promise.resolve(new OptionalError({ hasError: false }));
            }
            throw new Error(`Unexpected request: ${fqn}`);
        },
    };

    const previousStats = new URLFilterInfo({ rulesCount: 100_000, lastUpdate: 1_600_000_000 });
    const freshStats = new URLFilterInfo({ rulesCount: 250_000, lastUpdate: 1_700_000_000 });
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue());
    advancedBlocking.urlFilterState = new URLFilterState({
        enabled: true,
        protectionLevel: URLFilterProtectionLevel.essential,
        info: previousStats,
    });

    await advancedBlocking.updateSystemWideProtectionLevel(URLFilterProtectionLevel.safe);

    // Only the level update fires; the refreshed count arrives via the push.
    assert.equal(calls.length, 1);
    assert.equal(
        (calls[0] as { FQN: string }).FQN,
        'AdvancedBlockingService.RequestUpdateURLFilterProtectionLevel',
    );
    assert.equal(advancedBlocking.urlFilterState.protectionLevel, URLFilterProtectionLevel.safe);

    // The count is not re-read after the update; `OnURLFilterStateChanged`
    // delivers the fresh metadata instead.
    assert.equal(advancedBlocking.urlFilterState.info.rulesCount, previousStats.rulesCount);
    // The count field is cleared (loader) until the push delivers the new count.
    assert.equal(advancedBlocking.urlFilterInfo, null);

    // The first pushed state still carries the previous count: it is held.
    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.safe, previousStats));
    assert.equal(advancedBlocking.urlFilterInfo, null);

    // The next one carries the fresh count and ends the loader.
    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.safe, freshStats));
    assert.equal(advancedBlocking.urlFilterInfo, freshStats);
});

test('updateSystemWideProtectionLevel restores the previous level when the update fails', async (t) => {
    t.mock.timers.enable();
    const calls: unknown[] = [];
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: (req: unknown) => {
            calls.push(req);
            const fqn = (req as { FQN: string }).FQN;
            if (fqn === 'AdvancedBlockingService.RequestUpdateURLFilterProtectionLevel') {
                return Promise.resolve(new OptionalError({ hasError: true }));
            }
            // The error path re-reads the platform state; it reports the old level.
            if (fqn === 'AdvancedBlockingService.GetURLFilterState') {
                return Promise.resolve(new URLFilterState({
                    enabled: true,
                    protectionLevel: URLFilterProtectionLevel.essential,
                    info: new URLFilterInfo({ rulesCount: 100_000, lastUpdate: 1_600_000_000 }),
                }));
            }
            throw new Error(`Unexpected request: ${fqn}`);
        },
    };

    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue());
    advancedBlocking.urlFilterState = new URLFilterState({
        enabled: true,
        protectionLevel: URLFilterProtectionLevel.essential,
        info: new URLFilterInfo({ rulesCount: 100_000, lastUpdate: 1_600_000_000 }),
    });

    await advancedBlocking.updateSystemWideProtectionLevel(URLFilterProtectionLevel.safe);

    // Restored to the previously selected level after the failure.
    assert.equal(advancedBlocking.urlFilterState.protectionLevel, URLFilterProtectionLevel.essential);

    // The failed update leaves no hold behind: the pulled stats are displayed
    // and the next push is held as any first one.
    assert.equal(advancedBlocking.urlFilterInfo?.rulesCount, 100_000);
});

test('applyPushedURLFilterState holds the first push and shows the stats of the next one', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const previousStats = new URLFilterInfo({ rulesCount: 100_000, lastUpdate: 1_600_000_000 });
    const freshStats = new URLFilterInfo({ rulesCount: 250_000, lastUpdate: 1_700_000_000 });
    const advancedBlocking = await makeStoreShowing(URLFilterProtectionLevel.essential, previousStats);

    await advancedBlocking.updateSystemWideProtectionLevel(URLFilterProtectionLevel.safe);
    assert.equal(advancedBlocking.urlFilterInfo, null);

    // The first push is only held: the loader stays.
    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.safe, previousStats));
    assert.equal(advancedBlocking.urlFilterInfo, null);

    // The next push shows its stats.
    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.safe, freshStats));
    assert.equal(advancedBlocking.urlFilterInfo, freshStats);

    // A further push starts a new hold: the display keeps the shown stats.
    const nextStats = new URLFilterInfo({ rulesCount: 300_000, lastUpdate: 1_800_000_000 });
    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.safe, nextStats));
    assert.equal(advancedBlocking.urlFilterInfo, freshStats);
});

test('applyPushedURLFilterState alternates hold and show for a burst of pushes', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const previousStats = new URLFilterInfo({ rulesCount: 100_000, lastUpdate: 1_600_000_000 });
    const firstStats = new URLFilterInfo({ rulesCount: 250_000, lastUpdate: 1_700_000_000 });
    const secondStats = new URLFilterInfo({ rulesCount: 400_000, lastUpdate: 1_900_000_000 });
    const advancedBlocking = await makeStoreShowing(URLFilterProtectionLevel.essential, previousStats);

    // The user switches twice before any push arrives.
    await advancedBlocking.updateSystemWideProtectionLevel(URLFilterProtectionLevel.safe);
    await advancedBlocking.updateSystemWideProtectionLevel(URLFilterProtectionLevel.family);

    // First push is held, the next one is shown, and so on — the number of
    // pushes a fast level switch produces does not matter.
    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.family, previousStats));
    assert.equal(advancedBlocking.urlFilterInfo, null);

    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.family, firstStats));
    assert.equal(advancedBlocking.urlFilterInfo, firstStats);

    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.family, secondStats));
    assert.equal(advancedBlocking.urlFilterInfo, firstStats);
});

test('applyPushedURLFilterState holds the first push even when its stats look fresh', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const previousStats = new URLFilterInfo({ rulesCount: 100_000, lastUpdate: 1_600_000_000 });
    const freshStats = new URLFilterInfo({ rulesCount: 250_000, lastUpdate: 1_700_000_000 });
    const advancedBlocking = await makeStoreShowing(URLFilterProtectionLevel.essential, previousStats);

    await advancedBlocking.updateSystemWideProtectionLevel(URLFilterProtectionLevel.safe);

    // The prefilter of the level may be cached, so the first push can already
    // carry its stats; it is still held.
    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.safe, freshStats));
    assert.equal(advancedBlocking.urlFilterInfo, null);

    // No further push arrived: the held stats are shown instead of a stuck
    // loader.
    t.mock.timers.tick(URL_FILTER_INFO_FALLBACK_TIMEOUT_MS + 1);

    assert.equal(advancedBlocking.urlFilterInfo, freshStats);
});

test('applyPushedURLFilterState shows the stats of the next push even when it reports an error', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const previousStats = new URLFilterInfo({ rulesCount: 100_000, lastUpdate: 1_600_000_000 });
    const advancedBlocking = await makeStoreShowing(URLFilterProtectionLevel.essential, previousStats);

    await advancedBlocking.updateSystemWideProtectionLevel(URLFilterProtectionLevel.safe);
    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.safe, previousStats));
    assert.equal(advancedBlocking.urlFilterInfo, null);

    advancedBlocking.applyPushedURLFilterState(new URLFilterState({
        enabled: true,
        protectionLevel: URLFilterProtectionLevel.safe,
        status: URLFilterStatus.error,
        info: previousStats,
    }));

    // The refresh will not complete: the loader is replaced by the pushed
    // stats instead of hanging.
    assert.equal(advancedBlocking.urlFilterInfo, previousStats);
});

test('getURLFilterState shows the pulled stats right away', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const previousStats = new URLFilterInfo({ rulesCount: 100_000, lastUpdate: 1_600_000_000 });
    const freshStats = new URLFilterInfo({ rulesCount: 250_000, lastUpdate: 1_700_000_000 });
    const advancedBlocking = await makeStoreShowing(URLFilterProtectionLevel.essential, previousStats);

    // The pull is authoritative: it shows its stats right away.
    assert.equal(advancedBlocking.urlFilterInfo, previousStats);

    // A push is held again: the pulled stats stay until the timeout.
    advancedBlocking.applyPushedURLFilterState(makePush(URLFilterProtectionLevel.essential, freshStats));
    assert.equal(advancedBlocking.urlFilterInfo, previousStats);

    t.mock.timers.tick(URL_FILTER_INFO_FALLBACK_TIMEOUT_MS + 1);
    assert.equal(advancedBlocking.urlFilterInfo, freshStats);
});

/*
 * Failure notification: one snack per error state, no matter how many times
 * the same failure reaches the UI.
 */

test('reports one failure notification for a failed enable even when the response and the pushes report it', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.updateSystemWideProtection(true);

    assert.equal(queue.queueLength, 1);
    const [shownId] = notificationIds(queue);

    // The platform keeps pushing the same error state: the snack is not shown
    // again, and the shown one is not replaced.
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    advancedBlocking.applyPushedURLFilterState(makeErrorState());

    assert.deepEqual(notificationIds(queue), [shownId]);
});

test('does not report the same failure again on a repeated attempt', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.updateSystemWideProtection(true);
    const [shownId] = notificationIds(queue);

    // The retry fails the same way: the error state did not change.
    await advancedBlocking.updateSystemWideProtection(true);
    advancedBlocking.applyPushedURLFilterState(makeErrorState());

    assert.deepEqual(notificationIds(queue), [shownId]);
});

test('reports a failed retry once the snack auto-closed', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.updateSystemWideProtection(true);
    const [failedId] = notificationIds(queue);

    t.mock.timers.tick(DEFAULT_NOTIFY_LIFETIME + 1);
    assert.equal(queue.queueLength, 0);

    // The switch rolls back silently, so the snack is the only feedback the
    // retry can give.
    await advancedBlocking.updateSystemWideProtection(true);

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});

test('reports a failed retry once the user closed the snack', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.updateSystemWideProtection(true);
    const [failedId] = notificationIds(queue);
    queue.closeNotify(failedId);

    await advancedBlocking.updateSystemWideProtection(true);

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});

test('reports a failed retry once another notification dropped the snack', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.updateSystemWideProtection(true);

    dropWithForeignNotification(queue);
    const [foreignId] = notificationIds(queue);

    await advancedBlocking.updateSystemWideProtection(true);

    // The foreign notification stays: the retry is reported next to it.
    const [stillForeignId, retryId] = notificationIds(queue);
    assert.equal(stillForeignId, foreignId);
    assert.notEqual(retryId, foreignId);
    assert.equal(queue.queueLength, 2);
});

test('reports the failure again once the filter recovered', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.updateSystemWideProtection(true);
    const [failedId] = notificationIds(queue);

    // The filter runs again: the previous error is over.
    advancedBlocking.applyPushedURLFilterState(makeRunningState());

    await advancedBlocking.updateSystemWideProtection(true);

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});

test('reports the failure again once a pull reports the filter running', async (t) => {
    t.mock.timers.enable();
    const apiOptions: AdvancedBlockingApiOptions = {
        enabledUpdateFails: true,
        pulledState: makeErrorState(),
    };
    installAdvancedBlockingApi(apiOptions);
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.updateSystemWideProtection(true);
    const [failedId] = notificationIds(queue);

    // The pull finds the filter running: the previous error is over.
    apiOptions.pulledState = makeRunningState();
    await advancedBlocking.getURLFilterState();

    await advancedBlocking.updateSystemWideProtection(true);

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});

test('reports the failure again after a successful toggle', async (t) => {
    t.mock.timers.enable();
    const apiOptions: AdvancedBlockingApiOptions = {
        enabledUpdateFails: true,
        pulledState: makeErrorState(),
    };
    installAdvancedBlockingApi(apiOptions);
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.updateSystemWideProtection(true);
    const [failedId] = notificationIds(queue);

    // Turning the protection off lands: the error state is over.
    apiOptions.enabledUpdateFails = false;
    await advancedBlocking.updateSystemWideProtection(false);

    // The next failed enable is a new error and is reported.
    apiOptions.enabledUpdateFails = true;
    await advancedBlocking.updateSystemWideProtection(true);

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});

test('reports the failure again after a successful level change', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.updateSystemWideProtection(true);
    const [failedId] = notificationIds(queue);

    // The level change lands: the error state of the previous attempt is over.
    await advancedBlocking.updateSystemWideProtectionLevel(URLFilterProtectionLevel.safe);

    await advancedBlocking.updateSystemWideProtection(true);

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});

test('reports a real enable failure that follows a superseded one', async (t) => {
    t.mock.timers.enable();
    const pending: Array<(resp: OptionalError) => void> = [];
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: (req: unknown) => {
            const fqn = (req as { FQN: string }).FQN;
            if (fqn === 'AdvancedBlockingService.GetURLFilterState') {
                return Promise.resolve(new URLFilterState({
                    enabled: false,
                    protectionLevel: URLFilterProtectionLevel.essential,
                    status: URLFilterStatus.loading,
                    info: new URLFilterInfo({}),
                }));
            }
            return new Promise((resolve) => {
                pending.push(resolve);
            });
        },
    };
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    // A quick on → off: the platform answers the off first and rejects the
    // superseded on.
    const on = advancedBlocking.updateSystemWideProtection(true);
    const off = advancedBlocking.updateSystemWideProtection(false);
    pending[1](new OptionalError({ hasError: false }));
    await off;
    pending[0](new OptionalError({ hasError: true }));
    await on;

    // The rejected on left its snack behind; it closes on its own.
    const [supersededId] = notificationIds(queue);
    assert.ok(supersededId !== undefined);
    t.mock.timers.tick(DEFAULT_NOTIFY_LIFETIME + 1);
    assert.equal(queue.queueLength, 0);

    const retry = advancedBlocking.updateSystemWideProtection(true);
    pending[2](new OptionalError({ hasError: true }));
    await retry;

    // The retry is a real failure: it is reported instead of being taken for
    // the repeat of the superseded one.
    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, supersededId);
    assert.equal(queue.queueLength, 1);
});

test('a different failure replaces the shown notification', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({
        enabledUpdateFails: true,
        cacheResetFails: true,
        pulledState: makeErrorState(),
    });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.updateSystemWideProtection(true);
    const [enableFailureId] = notificationIds(queue);

    await advancedBlocking.resetURLFilterCache();

    const [cacheFailureId] = notificationIds(queue);
    assert.notEqual(cacheFailureId, enableFailureId);
    assert.equal(queue.queueLength, 1);
});

test('reports a repeated cache reset failure once the snack closed', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ cacheResetFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.resetURLFilterCache();
    const [failedId] = notificationIds(queue);

    // The failed call pulls an error state, so the key is kept and the repeat
    // is covered by the snack still on screen.
    await advancedBlocking.resetURLFilterCache();
    assert.deepEqual(notificationIds(queue), [failedId]);

    t.mock.timers.tick(DEFAULT_NOTIFY_LIFETIME + 1);

    await advancedBlocking.resetURLFilterCache();

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});

test('reports a repeated filter removal failure once the snack closed', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ removalFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue);

    await advancedBlocking.removeURLFilter();
    const [failedId] = notificationIds(queue);

    await advancedBlocking.removeURLFilter();
    assert.deepEqual(notificationIds(queue), [failedId]);

    t.mock.timers.tick(DEFAULT_NOTIFY_LIFETIME + 1);

    await advancedBlocking.removeURLFilter();

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});
