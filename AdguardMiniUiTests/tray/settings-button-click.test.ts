// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Click test for the tray home settings button.
 *
 * Verifies that clicking the settings button on the tray home page
 * does not error and the button remains present (it opens the settings
 * window in a separate process, so the tray stays open).
 *
 * @module TrayTests/SettingsButtonClick
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SciterDriver } from '@adg/sciter-test-driver';
import { connectWithRetry, MODULES } from '../helpers/driver.ts';

/** Test ID of the settings button on the tray home page. */
const SETTINGS_BUTTON_TEST_ID = 'tray-home-settings-button';

/**
 * Reads the per-test timeout from the E2E_TIMEOUT environment variable.
 * Falls back to 10 seconds if unset or invalid.
 *
 * @returns Timeout duration in milliseconds.
 */
function getTimeoutMs(): number {
    const fromEnv = parseInt(process.env.E2E_TIMEOUT || '', 10);
    return Number.isFinite(fromEnv) ? fromEnv : 10_000;
}

describe('Tray settings button click', () => {
    let driver: SciterDriver;
    const timeoutMs = getTimeoutMs();

    before(async () => {
        // The tray window auto-shows in DEBUG builds via TrayApp.swift.
        // On the first launch after build, wait 3s for the 2s delay in
        // TrayApp.init() to elapse.
        driver = await connectWithRetry(MODULES.tray, timeoutMs);
    });

    after(async () => {
        await driver?.disconnect();
    });

    it(`clicks #${SETTINGS_BUTTON_TEST_ID} without errors`, { timeout: timeoutMs }, async () => {
        const button = await driver.findElement(`#${SETTINGS_BUTTON_TEST_ID}`);
        assert.ok(button, `Element #${SETTINGS_BUTTON_TEST_ID} not found`);

        const visibleBefore = await button.isVisible();
        assert.ok(visibleBefore, `Element #${SETTINGS_BUTTON_TEST_ID} is not visible`);

        // Click the settings button; this opens the settings window in a
        // separate process so the tray remains visible.
        await button.click();
        await new Promise((r) => setTimeout(r, 300));

        // Verify the button is still visible after clicking.
        const visibleAfter = await button.isVisible();
        assert.ok(
            visibleAfter,
            `Element #${SETTINGS_BUTTON_TEST_ID} disappeared after click`,
        );
    });
});
