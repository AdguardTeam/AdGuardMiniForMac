// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';

import { getPaywallAdvantages } from 'Modules/settings/components/Paywall/advantages';

beforeEach(() => {
    (globalThis as unknown as { translate: (key: string) => string }).translate = (key) => key;
});

afterEach(() => {
    delete (globalThis as unknown as { translate?: unknown }).translate;
});

/**
 * Returns the localized labels of the paywall advantages.
 *
 * @param experimentalSystemWideProtectionEnabled Whether SWP is enabled.
 * @returns Labels in display order.
 */
function advantageLabels(experimentalSystemWideProtectionEnabled: boolean) {
    return getPaywallAdvantages(experimentalSystemWideProtectionEnabled)
        .map(({ label }) => label);
}

test('the paywall shows real-time filter updates when SWP is off', () => {
    assert.deepEqual(advantageLabels(false), [
        'settings.paywall.advantage.1',
        'settings.paywall.advantage.3',
        'settings.paywall.advantage.5',
        'settings.paywall.advantage.4',
    ]);
});

test('the paywall shows the SWP advantage when SWP is on', () => {
    assert.deepEqual(advantageLabels(true), [
        'settings.paywall.advantage.1',
        'settings.paywall.advantage.2',
        'settings.paywall.advantage.5',
        'settings.paywall.advantage.4',
    ]);
});
