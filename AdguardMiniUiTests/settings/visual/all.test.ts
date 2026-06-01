// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Visual regression tests for the Settings module.
 *
 * This is the **combined** test file that runs both element-level (component)
 * and full-page screenshots using a SINGLE shared SciterDriver connection.
 *
 * WHY combined?
 *   The Sciter test-peer.js only accepts one TCP client at a time. If
 *   component and page tests were in separate files, the second file's
 *   connection attempt would fail. By nesting both suites inside the same
 *   `describe` block, they share the `before`/`after` connect/disconnect
 *   lifecycle — only one connection is ever active.
 *
 * HOW navigation works:
 *   1. Each screenshot spec may declare a `navigate.click` (sidebar menu).
 *   2. Sub-pages (filters, theme, quit-reaction) require an extra click
 *      on the general settings page via `SUB_PAGE_NAV`.
 *   3. The reset-modal test sequences two extra clicks: context menu
 *      trigger → "Reset to default" item.
 *
 * @module VisualTests/Settings
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SciterDriver } from '@adg/sciter-test-driver';
import { connectWithRetry, MODULES } from '../../helpers/driver.ts';
import { captureAndCompare } from '../../helpers/visual.ts';
import type { ScreenshotSpec, VisualTestResult } from '../../helpers/visual.ts';

/**
 * Reads the per-test timeout from the E2E_TIMEOUT environment variable.
 * Falls back to 15 seconds if unset or invalid.
 */
function getTimeoutMs(): number {
    const fromEnv = parseInt(process.env.E2E_TIMEOUT || '', 10);
    return Number.isFinite(fromEnv) ? fromEnv : 15_000;
}

// ---------------------------------------------------------------------------
// Screenshot specs
// ---------------------------------------------------------------------------

/**
 * Screenshot specs for element-level ("component") captures.
 *
 * Each spec targets a specific interactive element on a settings page.
 * The `navigate` field ensures the correct page is visible before capture.
 *
 * @type {ScreenshotSpec[]}
 */
const COMPONENT_SCREENSHOTS: ScreenshotSpec[] = [
    // --- General page elements -------------------------------------------
    // These are only visible after clicking "Settings" in the sidebar.
    {
        name: 'protection-toggle', type: 'element', pageId: 'settings-general-page',
        selector: '#settings-general-launch-on-startup',
        navigate: { click: '#settings-menu-settings' },
    },
    {
        name: 'theme-link', type: 'element', pageId: 'settings-general-page',
        selector: '#settings-general-theme',
        navigate: { click: '#settings-menu-settings' },
    },

    // --- Safari Protection toggles ---------------------------------------
    // The safari-protection page is the default landing page, but we
    // navigate explicitly for determinism.
    {
        name: 'block-ads-toggle', type: 'element', pageId: 'settings-safari-protection-page',
        selector: '#settings-safari-protection-block-ads',
        navigate: { click: '#settings-menu-safari-protection' },
    },
    {
        name: 'block-trackers-toggle', type: 'element', pageId: 'settings-safari-protection-page',
        selector: '#settings-safari-protection-block-trackers',
        navigate: { click: '#settings-menu-safari-protection' },
    },

    // --- Sidebar menu items ----------------------------------------------
    // Captures a single menu entry to detect layout/icon regressions.
    {
        name: 'menu-items', type: 'element', pageId: 'settings-general-page',
        selector: '#settings-menu-safari-protection',
        navigate: { click: '#settings-menu-settings' },
    },

    // --- Reset modal -----------------------------------------------------
    // The modal is conditionally rendered — it does not exist in the DOM
    // until the user opens the header context menu and clicks
    // "Reset to default". See navigateToPage() for the open sequence.
    {
        name: 'reset-modal', type: 'element', pageId: 'settings-general-page',
        selector: '#settings-general-reset-modal',
        navigate: { click: '#settings-menu-settings' },
    },
];

/**
 * Screenshot specs for full-page captures.
 *
 * Each spec navigates to a settings page and takes a viewport-sized
 * screenshot. Sub-pages (accessible from the general page) use the
 * `SUB_PAGE_NAV` mapping for an extra click.
 *
 * @type {ScreenshotSpec[]}
 */
const PAGE_SCREENSHOTS: ScreenshotSpec[] = [
    // --- Top-level sidebar pages -----------------------------------------
    {
        name: 'full', type: 'full', selector: null,
        pageId: 'settings-general-page',
        navigate: { click: '#settings-menu-settings' },
    },
    {
        name: 'full', type: 'full', selector: null,
        pageId: 'settings-safari-protection-page',
        navigate: { click: '#settings-menu-safari-protection' },
    },
    {
        name: 'full', type: 'full', selector: null,
        pageId: 'settings-filters-page',
        navigate: { click: '#settings-menu-settings' },
    },
    {
        name: 'full', type: 'full', selector: null,
        pageId: 'settings-advanced-blocking-page',
        navigate: { click: '#settings-menu-advanced-blocking' },
    },
    {
        name: 'full', type: 'full', selector: null,
        pageId: 'settings-user-rules-page',
        navigate: { click: '#settings-menu-user-rules' },
    },
    {
        name: 'full', type: 'full', selector: null,
        pageId: 'settings-theme-page',
        navigate: { click: '#settings-menu-settings' },
    },
    {
        name: 'full', type: 'full', selector: null,
        pageId: 'settings-quit-reaction-page',
        navigate: { click: '#settings-menu-settings' },
    },
    {
        name: 'full', type: 'full', selector: null,
        pageId: 'settings-license-page',
        navigate: { click: '#settings-menu-license' },
    },
    {
        name: 'full', type: 'full', selector: null,
        pageId: 'settings-support-page',
        navigate: { click: '#settings-menu-support' },
    },
    {
        name: 'full', type: 'full', selector: null,
        pageId: 'settings-about-page',
        navigate: { click: '#settings-menu-about' },
    },
];

/**
 * Mapping from sub-page IDs to the CSS selector of their trigger link
 * on the general settings page.
 *
 * Sub-pages (filters, theme, quit-reaction) are not in the sidebar menu.
 * They are accessed by clicking a row on the general settings page.
 *
 * @type {Record<string, string>}
 */
const SUB_PAGE_NAV: Record<string, string> = {
    'settings-filters-page': '#settings-general-filters',
    'settings-theme-page': '#settings-general-theme',
    'settings-quit-reaction-page': '#settings-general-quit-reaction',
};

// ---------------------------------------------------------------------------
// Navigation helper
// ---------------------------------------------------------------------------

/**
 * Navigates to the page required by a screenshot spec.
 *
 * Handles three layers of navigation:
 *   1. Sidebar menu click (all specs).
 *   2. Sub-page link click (filters, theme, quit-reaction).
 *   3. Context menu + "Reset to default" click (reset-modal only).
 *
 * @param driver - Connected SciterDriver instance.
 * @param spec   - The screenshot spec to navigate for.
 */
async function navigateToPage(driver: SciterDriver, spec: ScreenshotSpec): Promise<void> {
    // Step 1: Click the sidebar menu item to reach the parent page.
    if (spec.navigate?.click) {
        const btn = await driver.findElement(spec.navigate.click);
        await btn.click();
        // Brief pause for Sciter to render the new page.
        await new Promise((r) => setTimeout(r, 400));
    }

    // Step 2: If this is a sub-page, click the link on the general page.
    const subPageSelector = SUB_PAGE_NAV[spec.pageId];
    if (subPageSelector) {
        const subPageBtn = await driver.findElement(subPageSelector);
        await subPageBtn.click();
        await new Promise((r) => setTimeout(r, 400));
    }

    // Step 3: For the reset modal, open the header context menu and
    // click "Reset to default" to make the modal appear.
    // The modal is conditionally rendered — it doesn't exist in the DOM
    // until this sequence completes.
    if (spec.name === 'reset-modal') {
        const menuBtn = await driver.findElement('#settings-general-context-menu');
        await menuBtn.click();
        await new Promise((r) => setTimeout(r, 400));

        const resetItem = await driver.findElement('#settings-general-reset-trigger');
        await resetItem.click();
        // Longer pause to let the modal animation finish.
        await new Promise((r) => setTimeout(r, 500));
    }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

/**
 * Visual regression suite for the Settings module.
 *
 * Uses a **single** SciterDriver connection for all tests (both component
 * and page suites) because the test peer only supports one TCP client at
 * a time.
 */
describe('Visual: Settings', () => {
    /** Shared SciterDriver instance reused across all tests. */
    let driver: SciterDriver;
    /** Per-test timeout from environment or default. */
    const timeoutMs = getTimeoutMs();
    /** Accumulates VisualTestResult entries for the summary in after(). */
    const results: VisualTestResult[] = [];

    /**
     * Connects to the Settings test peer once before any tests run.
     * Retries until the deadline if the port isn't ready yet.
     */
    before(async () => {
        driver = await connectWithRetry(MODULES.settings, timeoutMs);
    });

    /**
     * Disconnects from the test peer and prints a summary of all results.
     */
    after(async () => {
        await driver?.disconnect();
        const passed = results.filter((r) => r.status === 'PASS').length;
        const failed = results.filter((r) => r.status === 'FAIL').length;
        const new_ = results.filter((r) => r.status === 'NEW').length;
        const errors = results.filter((r) => r.status === 'ERROR').length;
        console.log(
            `\n  Visual results: ${results.length} total, `
            + `${passed} passed, ${failed} failed, ${new_} new, ${errors} errors`,
        );
    });

    /**
     * Element-level screenshot tests.
     * Captures individual interactive components (toggles, menu items, modals).
     */
    describe('components', () => {
        for (const spec of COMPONENT_SCREENSHOTS) {
            it(`${spec.pageId} -- ${spec.name}`, { timeout: timeoutMs }, async () => {
                await navigateToPage(driver, spec);

                const result = await captureAndCompare(driver, spec, 'settings');
                results.push(result);

                if (result.status === 'FAIL') {
                    const pct = (result.diffPercent * 100).toFixed(2);
                    assert.fail(
                        `Screenshot mismatch: ${result.diffPixels}/${result.totalPixels} `
                        + `pixels differ (${pct}%)`,
                    );
                } else if (result.status === 'NEW') {
                    console.log(`  [NEW] No baseline for ${result.screenshotName}, saved as candidate`);
                } else if (result.status === 'ERROR') {
                    assert.fail(`Screenshot error: ${result.error}`);
                }
            });
        }
    });

    /**
     * Full-page screenshot tests.
     * Captures every Settings page at viewport size.
     */
    describe('pages', () => {
        for (const spec of PAGE_SCREENSHOTS) {
            it(`${spec.pageId} full-page screenshot`, { timeout: timeoutMs }, async () => {
                await navigateToPage(driver, spec);

                const result = await captureAndCompare(driver, spec, 'settings');
                results.push(result);

                if (result.status === 'FAIL') {
                    const pct = (result.diffPercent * 100).toFixed(2);
                    assert.fail(
                        `Screenshot mismatch: ${result.diffPixels}/${result.totalPixels} `
                        + `pixels differ (${pct}%)`,
                    );
                } else if (result.status === 'NEW') {
                    // NEW is not a failure — the first run always creates baselines.
                    console.log(`  [NEW] No baseline for ${result.screenshotName}, saved as candidate`);
                } else if (result.status === 'ERROR') {
                    assert.fail(`Screenshot error: ${result.error}`);
                }
            });
        }
    });
});
