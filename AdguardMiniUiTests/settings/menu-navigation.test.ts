// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Settings sidebar menu navigation tests.
 *
 * Verifies that clicking each sidebar menu item navigates to the correct
 * page by asserting the target page container becomes visible. Covers all
 * 7 sidebar entries: Safari Protection, Advanced Blocking, User Rules,
 * Settings/General, License, Support, and About.
 *
 * Uses the SciterDriver to find menu elements by test ID, click them,
 * and wait for the corresponding page container to appear in the DOM.
 *
 * @module NavigationTests/Settings
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SciterDriver } from '@adg/sciter-test-driver';
import { connectWithRetry, MODULES } from '../helpers/driver.ts';

/**
 * Menu item testId → expected page container testId.
 * Each entry clicks the menu item via SciterElement.click() (now properly fixed
 * in the test peer) and verifies the target page becomes visible.
 */
const MENU_NAVIGATION_MAP: Record<string, string> = {
    'settings-menu-safari-protection': 'settings-safari-protection-page',
    'settings-menu-advanced-blocking': 'settings-advanced-blocking-page',
    'settings-menu-user-rules': 'settings-user-rules-page',
    'settings-menu-settings': 'settings-general-page',
    'settings-menu-license': 'settings-license-page',
    'settings-menu-support': 'settings-support-page',
    'settings-menu-about': 'settings-about-page',
};

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

describe('Settings menu navigation', () => {
    let driver: SciterDriver;
    const timeoutMs = getTimeoutMs();

    before(async () => {
        driver = await connectWithRetry(MODULES.settings, timeoutMs);
    });

    after(async () => {
        await driver?.disconnect();
    });

    for (const [menuTestId, pageTestId] of Object.entries(MENU_NAVIGATION_MAP)) {
        it(`clicking #${menuTestId} shows #${pageTestId}`, { timeout: timeoutMs }, async () => {
            const menuItem = await driver.findElement(`#${menuTestId}`);
            await menuItem.click();
            await new Promise((r) => setTimeout(r, 300));

            const pageEl = await driver.waitForElement(
                `#${pageTestId}`,
                { timeout: 5000 },
            );
            const visible = await pageEl.isVisible();
            assert.ok(
                visible,
                `Page container #${pageTestId} is not visible after clicking #${menuTestId}`,
            );
        });
    }
});
