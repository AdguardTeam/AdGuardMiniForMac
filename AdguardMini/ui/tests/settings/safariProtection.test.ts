// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';

import {
    FiltersDefinedGroups,
    FiltersIds,
    FiltersIndex,
    OptionalError,
} from 'Apis/types';
import { Filters } from 'Modules/settings/store/modules/Filters';
import { SafariProtection } from 'Modules/settings/store/modules/SafariProtection';

// `Filters.setIndex` spreads the annoyances group, which defaults to group 0.
const EMPTY_GROUP_ID = 0;
const PRIVACY_GROUP_ID = 2;
const TRACKERS_FILTER_ID = 3;
const MAIL_FILTER_ID = 25;

beforeEach(() => {
    (globalThis as unknown as { window: Record<string, unknown> }).window =
        globalThis as unknown as Record<string, unknown>;
});

afterEach(() => {
    delete (globalThis as unknown as { API?: unknown }).API;
    delete (globalThis as unknown as { window?: unknown }).window;
});

/**
 * Builds a Safari Protection store whose privacy group recommends both the
 * trackers filter and the email-trackers filter.
 *
 * @param enabledFilters Filter IDs the platform reports as enabled.
 * @returns The Filters store and the Safari Protection store built on it.
 */
function createSafariProtection(enabledFilters: number[]) {
    const filters = new Filters();
    filters.setEnabledFilters(enabledFilters);
    filters.setIndex(new FiltersIndex({
        mailTrackingProtectionId: MAIL_FILTER_ID,
        definedGroups: new FiltersDefinedGroups({ privacy: PRIVACY_GROUP_ID }),
        recommendedFiltersIdsByGroupDict: new Map([
            [EMPTY_GROUP_ID, new FiltersIds({ ids: [] })],
            [PRIVACY_GROUP_ID, new FiltersIds({ ids: [TRACKERS_FILTER_ID, MAIL_FILTER_ID] })],
        ]),
        otherFiltersIdsByGroupDict: new Map([
            [EMPTY_GROUP_ID, new FiltersIds({ ids: [] })],
        ]),
    }));

    return { filters, safariProtection: new SafariProtection(filters) };
}

test('blockTrackers ignores the email-trackers filter', () => {
    const { safariProtection } = createSafariProtection([TRACKERS_FILTER_ID]);

    assert.equal(safariProtection.blockTrackers, true);
});

test('blockTrackers is off when the trackers filter is disabled', () => {
    const { safariProtection } = createSafariProtection([MAIL_FILTER_ID]);

    assert.equal(safariProtection.blockTrackers, false);
});

test('updateBlockTrackers toggles only the trackers filter', async () => {
    const calls: unknown[] = [];
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: (req: unknown) => {
            calls.push(req);
            return Promise.resolve(new OptionalError({ hasError: false }));
        },
    };
    const { filters, safariProtection } = createSafariProtection([
        TRACKERS_FILTER_ID,
        MAIL_FILTER_ID,
    ]);

    await safariProtection.updateBlockTrackers(false);

    assert.deepEqual([...filters.enabledFilters], [MAIL_FILTER_ID]);
    const request = calls[0] as {
        getRequestMessage(): { ids: number[]; isEnabled: boolean };
    };
    assert.deepEqual(request.getRequestMessage().ids, [TRACKERS_FILTER_ID]);
    assert.equal(request.getRequestMessage().isEnabled, false);
});

test('blockEmailTrackers ignores the trackers filter', () => {
    const { safariProtection } = createSafariProtection([TRACKERS_FILTER_ID]);

    assert.equal(safariProtection.blockEmailTrackers, false);
});

test('blockEmailTrackers is on when the email-trackers filter is enabled', () => {
    const { safariProtection } = createSafariProtection([MAIL_FILTER_ID]);

    assert.equal(safariProtection.blockEmailTrackers, true);
});

test('updateBlockEmailTrackers toggles only the email-trackers filter', async () => {
    const calls: unknown[] = [];
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: (req: unknown) => {
            calls.push(req);
            return Promise.resolve(new OptionalError({ hasError: false }));
        },
    };
    const { filters, safariProtection } = createSafariProtection([
        TRACKERS_FILTER_ID,
        MAIL_FILTER_ID,
    ]);

    await safariProtection.updateBlockEmailTrackers(false);

    assert.deepEqual([...filters.enabledFilters], [TRACKERS_FILTER_ID]);
    const request = calls[0] as {
        getRequestMessage(): { ids: number[]; isEnabled: boolean };
    };
    assert.deepEqual(request.getRequestMessage().ids, [MAIL_FILTER_ID]);
    assert.equal(request.getRequestMessage().isEnabled, false);
});
