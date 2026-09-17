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
import { NotificationsQueue } from 'Common/stores/NotificationsQueue';

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
 * Installs an `API.Execute` stub for the System-wide Protection flow and
 * collects the dispatched requests.
 *
 * @param options Level-update failure flag and the state the pull returns.
 */
function installAdvancedBlockingApi(options: {
    levelUpdateFails?: boolean;
    pulledState?: URLFilterState;
} = {}) {
    const calls: unknown[] = [];
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: (req: unknown) => {
            calls.push(req);
            const fqn = (req as { FQN: string }).FQN;
            switch (fqn) {
                case 'AdvancedBlockingService.RequestUpdateURLFilterProtectionLevel':
                    return Promise.resolve(new OptionalError({ hasError: options.levelUpdateFails ?? false }));
                case 'AdvancedBlockingService.SetURLFilterEnabled':
                    return Promise.resolve(new OptionalError({ hasError: false }));
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
