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
    EmptyValue,
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
    URL_FILTER_STATE_SETTLE_MS,
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
    statePullRejects?: boolean;
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
                case 'AdvancedBlockingService.RetryURLFilter':
                    return Promise.resolve(new EmptyValue());
                case 'AdvancedBlockingService.GetURLFilterState':
                    if (options.statePullRejects) {
                        return Promise.reject(new Error('RPC "GetURLFilterState" was rejected by the native side'));
                    }
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
        userIntentEnabled: true,
        info: new URLFilterInfo({}),
    });
}

/**
 * Builds the state the platform reports when a DNS filter blocks the iCloud
 * hosts System-wide Protection needs.
 */
function makeDNSFailureState(): URLFilterState {
    return new URLFilterState({
        enabled: false,
        protectionLevel: URLFilterProtectionLevel.essential,
        status: URLFilterStatus.dns_error,
        userIntentEnabled: true,
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
        userIntentEnabled: true,
        info: new URLFilterInfo({}),
    });
}

/**
 * Builds the state the platform reports when the user declined the system
 * install prompt.
 */
function makeDeclinedState(): URLFilterState {
    return new URLFilterState({
        enabled: false,
        protectionLevel: URLFilterProtectionLevel.essential,
        status: URLFilterStatus.loading,
        isInstalled: false,
        userIntentEnabled: false,
        info: new URLFilterInfo({}),
    });
}

/**
 * Builds the state the platform reports for an installed configuration.
 */
function makeInstalledState(): URLFilterState {
    return new URLFilterState({
        enabled: true,
        protectionLevel: URLFilterProtectionLevel.essential,
        status: URLFilterStatus.running,
        isInstalled: true,
        userIntentEnabled: true,
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
 * Advances virtual time past the URL-filter state settle window.
 *
 * @param t Test context with mock timers.
 */
function settleURLFilterState(t: { mock: { timers: { tick(ms: number): void } } }) {
    t.mock.timers.tick(URL_FILTER_STATE_SETTLE_MS + 1);
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
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});
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
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});
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

    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});
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
 * Failure notification: the snack reports a bring-up failure with a link to
 * the troubleshooting steps, wherever the user is; automatic reports are
 * collapsed to one per System-wide Protection page visit.
 */

test('shows the unavailable snack with the troubleshooting action for an explicit enable failure', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    let opened = 0;
    const advancedBlocking = new AdvancedBlocking(queue, () => { opened += 1; });

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);

    assert.equal(queue.queueLength, 1);
    const [shownId] = notificationIds(queue);
    const snack = queue.get(shownId)?.props as {
        message?: string;
        btnLabel?: string;
        onClick?(): void;
    };
    assert.equal(snack?.message, 'advanced.blocking.system.wide.unavailable');
    assert.equal(snack?.btnLabel, 'advanced.blocking.system.wide.troubleshooting');

    // The action opens the page that carries the troubleshooting steps and
    // asks it to scroll them into view.
    snack?.onClick?.();
    assert.equal(opened, 1);
    assert.equal(advancedBlocking.scrollToTroubleshootingRequested, true);

    // The page consumes the request once it scrolled.
    advancedBlocking.consumeTroubleshootingScroll();
    assert.equal(advancedBlocking.scrollToTroubleshootingRequested, false);
});

test('does not repeat the snack for the same failure while it is shown', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);
    const [shownId] = notificationIds(queue);

    // The platform keeps pushing the same failure and the user presses the
    // switch again: the snack is not shown again.
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    settleURLFilterState(t);
    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);

    assert.deepEqual(notificationIds(queue), [shownId]);
});

test('does not repeat an automatic failure after the snack closed within the visit', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    // The automatic retry fails while the page is open: the snack is shown.
    advancedBlocking.beginSystemWideProtectionPageVisit();
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    const [firstId] = notificationIds(queue);

    // The snack auto-closes; the platform keeps reporting the same failure.
    t.mock.timers.tick(DEFAULT_NOTIFY_LIFETIME + 1);
    assert.equal(queue.queueLength, 0);
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    settleURLFilterState(t);
    assert.equal(queue.queueLength, 0, 'the automatic report stays collapsed for the visit');

    // A new page visit re-arms the automatic report.
    advancedBlocking.beginSystemWideProtectionPageVisit();
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    settleURLFilterState(t);

    const [secondId] = notificationIds(queue);
    assert.notEqual(secondId, firstId);
    assert.equal(queue.queueLength, 1);
});

test('reports an automatic failure again after the page visit ends', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    // The visit reports the failure once; the snack auto-closes.
    advancedBlocking.beginSystemWideProtectionPageVisit();
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    const [firstId] = notificationIds(queue);
    t.mock.timers.tick(DEFAULT_NOTIFY_LIFETIME + 1);
    assert.equal(queue.queueLength, 0);

    // Leaving the page ends the visit: the failure is reported again.
    advancedBlocking.endSystemWideProtectionPageVisit();
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    settleURLFilterState(t);

    const [secondId] = notificationIds(queue);
    assert.notEqual(secondId, firstId);
    assert.equal(queue.queueLength, 1);
});

test('reports a failed retry once the user closed the snack', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);
    const [failedId] = notificationIds(queue);
    queue.closeNotify(failedId);

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});

test('reports a failed retry once another notification dropped the snack', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);

    dropWithForeignNotification(queue);
    const [foreignId] = notificationIds(queue);

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);

    // The foreign notification stays: the retry is reported next to it.
    const [stillForeignId, retryId] = notificationIds(queue);
    assert.equal(stillForeignId, foreignId);
    assert.notEqual(retryId, foreignId);
    assert.equal(queue.queueLength, 2);
});

test('reports a pushed failure on the Advanced blocking page', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    // The switch also lives on the Advanced blocking page, so the failure is
    // reported without a visit to the System-wide Protection page.
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, true);
    assert.equal(queue.queueLength, 1);
});

test('reports a failure again once the filter recovered', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);
    const [failedId] = notificationIds(queue);

    // The filter runs again: the previous error is over.
    advancedBlocking.applyPushedURLFilterState(makeRunningState());
    settleURLFilterState(t);
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    settleURLFilterState(t);

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});

test('reports a failure of a new explicit attempt after the user turned the filter off', async (t) => {
    t.mock.timers.enable();
    const apiOptions: AdvancedBlockingApiOptions = {
        enabledUpdateFails: true,
        pulledState: makeErrorState(),
    };
    installAdvancedBlockingApi(apiOptions);
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);
    const [failedId] = notificationIds(queue);

    // Turning the protection off lands: the previous failure is over.
    apiOptions.enabledUpdateFails = false;
    await advancedBlocking.updateSystemWideProtection(false);

    // A new OFF → ON attempt fails: the failure is reported again.
    apiOptions.enabledUpdateFails = true;
    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, failedId);
    assert.equal(queue.queueLength, 1);
});

test('reports the failure of an explicit attempt after an automatic report', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    // The automatic retry reported the failure and the snack auto-closed.
    advancedBlocking.beginSystemWideProtectionPageVisit();
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    const [automaticId] = notificationIds(queue);
    t.mock.timers.tick(DEFAULT_NOTIFY_LIFETIME + 1);
    assert.equal(queue.queueLength, 0);

    // An explicit attempt fails: the failure is reported even though the
    // visit already reported one.
    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);

    const [retryId] = notificationIds(queue);
    assert.notEqual(retryId, automaticId);
    assert.equal(queue.queueLength, 1);
});

test('does not report a declined system install prompt', async (t) => {
    t.mock.timers.enable();
    const apiOptions: AdvancedBlockingApiOptions = {
        enabledUpdateFails: true,
        pulledState: makeDeclinedState(),
    };
    installAdvancedBlockingApi(apiOptions);
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);

    // The declined prompt rolls the toggle back to OFF without a snack.
    assert.equal(queue.queueLength, 0);
    assert.equal(advancedBlocking.urlFilterState.userIntentEnabled, false);
    assert.equal(advancedBlocking.isSystemWideProtectionInactive, false);
    assert.equal(advancedBlocking.isSystemWideProtectionEnabling, false);

    // A later attempt whose intent survives is reported again.
    apiOptions.pulledState = makeErrorState();
    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);

    assert.equal(queue.queueLength, 1);
});

test('reports an explicit enable failure when the state pull rejects', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, statePullRejects: true });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(true);

    // The pull cannot confirm a decline: the explicit attempt reports its failure.
    assert.equal(queue.queueLength, 1);
});

test('reports a failed disable while the user\'s intent is off', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({
        enabledUpdateFails: true,
        pulledState: new URLFilterState({
            enabled: true,
            status: URLFilterStatus.running,
            userIntentEnabled: false,
            info: new URLFilterInfo({}),
        }),
    });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(false);
    settleURLFilterState(t);

    // The filter may still run against the user's wish: the failure is real.
    assert.equal(queue.queueLength, 1);
});

test('retries a failed bring-up only while the user keeps the filter on', async (t) => {
    t.mock.timers.enable();
    const calls = installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    // The user has not selected the filter: nothing to retry.
    await advancedBlocking.retrySystemWideProtection();
    assert.equal(calls.length, 0);

    advancedBlocking.setURLFilterState(new URLFilterState({ userIntentEnabled: true }));
    await advancedBlocking.retrySystemWideProtection();

    assert.equal(calls.length, 1);
    assert.equal((calls[0] as { FQN: string }).FQN, 'AdvancedBlockingService.RetryURLFilter');
});

test('marks the switch inactive while the selected filter is not running', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    // Selected and running: the switch is green.
    advancedBlocking.applyPushedURLFilterState(makeRunningState());
    assert.equal(advancedBlocking.isSystemWideProtectionInactive, false);

    // Selected but not running: the switch shows its inactive "on" state.
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    settleURLFilterState(t);
    assert.equal(advancedBlocking.isSystemWideProtectionInactive, true);

    // Not selected: the switch is off.
    advancedBlocking.applyPushedURLFilterState(new URLFilterState({
        userIntentEnabled: false,
        info: new URLFilterInfo({}),
    }));
    settleURLFilterState(t);
    assert.equal(advancedBlocking.isSystemWideProtectionInactive, false);
});

test('marks the switch enabling while the selected filter is brought up', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    // Selected and starting: the switch shows the in-progress "on" state.
    advancedBlocking.applyPushedURLFilterState(new URLFilterState({
        enabled: true,
        status: URLFilterStatus.loading,
        userIntentEnabled: true,
        info: new URLFilterInfo({}),
    }));
    assert.equal(advancedBlocking.isSystemWideProtectionEnabling, true);
    assert.equal(advancedBlocking.isSystemWideProtectionInactive, false);

    // Confirmed running: the switch turns green.
    advancedBlocking.applyPushedURLFilterState(makeRunningState());
    settleURLFilterState(t);
    assert.equal(advancedBlocking.isSystemWideProtectionEnabling, false);
    assert.equal(advancedBlocking.isSystemWideProtectionInactive, false);

    // The attempt failed: the switch goes back to ON INACTIVE.
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    settleURLFilterState(t);
    assert.equal(advancedBlocking.isSystemWideProtectionEnabling, false);
    assert.equal(advancedBlocking.isSystemWideProtectionInactive, true);
});

test('waits for the platform before marking the URL filter state loaded', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ pulledState: makeRunningState() });
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    assert.equal(advancedBlocking.isURLFilterStateLoaded, false);

    await advancedBlocking.getURLFilterState();

    assert.equal(advancedBlocking.isURLFilterStateLoaded, true);
});

test('keeps the shown state while the platform reports starting/failed cycles', (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});
    advancedBlocking.setURLFilterState(makeRunningState());

    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    advancedBlocking.applyPushedURLFilterState(makeRunningState());
    advancedBlocking.applyPushedURLFilterState(makeErrorState());

    // None of the transient states is shown.
    assert.equal(advancedBlocking.urlFilterState.status, URLFilterStatus.running);

    settleURLFilterState(t);

    assert.equal(advancedBlocking.urlFilterState.status, URLFilterStatus.error);
});

test('shows the first platform state without waiting for the settle window', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ pulledState: makeErrorState() });
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    await advancedBlocking.getURLFilterState();

    assert.equal(advancedBlocking.isURLFilterStateLoaded, true);
    assert.equal(advancedBlocking.urlFilterState.status, URLFilterStatus.error);
});

test('keeps the switch enabling through a failed bring-up and settles after the window', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    const attempt = advancedBlocking.updateSystemWideProtection(true);

    // The optimistic state is shown before the platform answers.
    assert.equal(advancedBlocking.isSystemWideProtectionEnabling, true);

    await attempt;

    // The pull is pending: the switch stays enabling and no snack is shown.
    assert.equal(advancedBlocking.isSystemWideProtectionEnabling, true);
    assert.equal(queue.queueLength, 0);

    // The platform keeps cycling: the displayed state does not move.
    advancedBlocking.applyPushedURLFilterState(makeRunningState());
    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    assert.equal(advancedBlocking.isSystemWideProtectionEnabling, true);

    settleURLFilterState(t);

    assert.equal(advancedBlocking.isSystemWideProtectionInactive, true);
    assert.equal(queue.queueLength, 1);
});

test('turns the switch green only after the running state stays stable', (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});
    advancedBlocking.setURLFilterState(new URLFilterState({
        enabled: true,
        status: URLFilterStatus.loading,
        userIntentEnabled: true,
    }));

    advancedBlocking.applyPushedURLFilterState(makeRunningState());
    assert.equal(advancedBlocking.isSystemWideProtectionEnabling, true);

    settleURLFilterState(t);

    assert.equal(advancedBlocking.isSystemWideProtectionEnabling, false);
    assert.equal(advancedBlocking.isSystemWideProtectionInactive, false);
});

test('a new user toggle drops the pending platform state', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});
    advancedBlocking.setURLFilterState(makeRunningState());

    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    await advancedBlocking.updateSystemWideProtection(false);
    settleURLFilterState(t);

    assert.equal(advancedBlocking.urlFilterState.userIntentEnabled, false);
    assert.equal(advancedBlocking.isSystemWideProtectionInactive, false);
});

test('marks the URL filter state loaded on a pushed state', (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    advancedBlocking.applyPushedURLFilterState(makeRunningState());

    assert.equal(advancedBlocking.isURLFilterStateLoaded, true);
});

test('a different failure replaces the shown notification', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({
        enabledUpdateFails: true,
        cacheResetFails: true,
        pulledState: makeErrorState(),
    });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);
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
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

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
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

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

test('removeURLFilterIfInstalled removes an installed configuration', async (t) => {
    t.mock.timers.enable();
    const calls = installAdvancedBlockingApi({ pulledState: makeInstalledState() });
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    const removed = await advancedBlocking.removeURLFilterIfInstalled();

    assert.equal(removed, true);
    assert.equal(
        calls.filter((request) => (request as { FQN: string }).FQN === 'AdvancedBlockingService.RemoveURLFilter').length,
        1,
    );
});

test('removeURLFilterIfInstalled skips removal when no configuration is installed', async () => {
    const calls = installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    const removed = await advancedBlocking.removeURLFilterIfInstalled();

    assert.equal(removed, true);
    assert.equal(
        calls.some((request) => (request as { FQN: string }).FQN === 'AdvancedBlockingService.RemoveURLFilter'),
        false,
    );
});

test('removeURLFilterIfInstalled reports a failed removal', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ pulledState: makeInstalledState(), removalFails: true });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    const removed = await advancedBlocking.removeURLFilterIfInstalled();

    assert.equal(removed, false);
    assert.equal(queue.queueLength, 1);
});

/*
 * iCloud failure: the Safari Protection page shows its dedicated card for
 * this state, and the failure is also reported as a snack.
 */

test('reports a pushed DNS failure and marks System-wide Protection unavailable', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    advancedBlocking.applyPushedURLFilterState(makeDNSFailureState());

    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, true);
    assert.equal(queue.queueLength, 1);
});

test('reports the pull\'s generic error and marks System-wide Protection unavailable', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.getURLFilterState();

    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, true);
    assert.equal(queue.queueLength, 1);
});

test('does not report an automatic failure outside the pages that carry the switch', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ pulledState: makeDNSFailureState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {}, () => false);

    await advancedBlocking.getURLFilterState();

    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, true);
    assert.equal(queue.queueLength, 0);
});

test('does not report an explicit failure outside the pages that carry the switch', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {}, () => false);

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);

    assert.equal(queue.queueLength, 0);
});

test('closes the unavailable snack when the user leaves the switch pages', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);
    assert.equal(queue.queueLength, 1);

    advancedBlocking.closeSystemWideProtectionUnavailableSnack();

    assert.equal(queue.queueLength, 0);
});

test('keeps a maintenance failure snack when the user leaves the switch pages', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ cacheResetFails: true, pulledState: makeRunningState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.resetURLFilterCache();
    assert.equal(queue.queueLength, 1);

    advancedBlocking.closeSystemWideProtectionUnavailableSnack();

    assert.equal(queue.queueLength, 1);
});

test('does not mark System-wide Protection unavailable for non-error states', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, false);

    advancedBlocking.applyPushedURLFilterState(makeRunningState());
    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, false);

    advancedBlocking.applyPushedURLFilterState(new URLFilterState({
        status: URLFilterStatus.loading,
        userIntentEnabled: true,
        info: new URLFilterInfo({}),
    }));
    settleURLFilterState(t);
    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, false);
});

test('does not mark System-wide Protection unavailable without user intent', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    advancedBlocking.applyPushedURLFilterState(new URLFilterState({
        status: URLFilterStatus.error,
        userIntentEnabled: false,
        info: new URLFilterInfo({}),
    }));
    settleURLFilterState(t);

    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, false);
});

test('does not mark System-wide Protection unavailable without a license', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(
        new NotificationsQueue(),
        () => {},
        () => true,
        () => false,
    );

    advancedBlocking.applyPushedURLFilterState(makeErrorState());
    settleURLFilterState(t);

    assert.equal(advancedBlocking.urlFilterState.userIntentEnabled, true);
    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, false);
});

test('does not report an automatic failure without a license', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ pulledState: makeDNSFailureState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(
        queue,
        () => {},
        () => true,
        () => false,
    );

    await advancedBlocking.getURLFilterState();
    settleURLFilterState(t);

    assert.equal(queue.queueLength, 0);
});

test('does not retry System-wide Protection without a license', async () => {
    const calls = installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(
        new NotificationsQueue(),
        () => {},
        () => true,
        () => false,
    );
    advancedBlocking.setURLFilterState(makeErrorState());

    await advancedBlocking.retrySystemWideProtection();

    assert.equal(
        calls.some((req) => (req as { FQN: string }).FQN === 'AdvancedBlockingService.RetryURLFilter'),
        false,
    );
});

test('retries System-wide Protection with a license', async () => {
    const calls = installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(
        new NotificationsQueue(),
        () => {},
        () => true,
        () => true,
    );
    advancedBlocking.setURLFilterState(makeErrorState());

    await advancedBlocking.retrySystemWideProtection();

    assert.equal(
        calls.some((req) => (req as { FQN: string }).FQN === 'AdvancedBlockingService.RetryURLFilter'),
        true,
    );
});

test('a pushed DNS failure does not replace the snack of a failed enable', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi({ enabledUpdateFails: true, pulledState: makeErrorState() });
    const queue = new NotificationsQueue();
    const advancedBlocking = new AdvancedBlocking(queue, () => {});

    await advancedBlocking.updateSystemWideProtection(true);
    settleURLFilterState(t);
    const [failedId] = notificationIds(queue);

    advancedBlocking.applyPushedURLFilterState(makeDNSFailureState());
    settleURLFilterState(t);

    assert.deepEqual(notificationIds(queue), [failedId]);
    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, true);
});

test('clears the DNS failure once the filter runs again', async (t) => {
    t.mock.timers.enable();
    installAdvancedBlockingApi();
    const advancedBlocking = new AdvancedBlocking(new NotificationsQueue(), () => {});

    advancedBlocking.applyPushedURLFilterState(makeDNSFailureState());
    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, true);

    advancedBlocking.applyPushedURLFilterState(makeRunningState());
    settleURLFilterState(t);
    assert.equal(advancedBlocking.isSystemWideProtectionUnavailable, false);
});
