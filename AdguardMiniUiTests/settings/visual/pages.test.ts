// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Full-page visual regression tests for Settings.
 *
 * This is a **fallback** file for environments where the combined
 * `all.test.ts` cannot be used. Separate files each create their own
 * SciterDriver connection, which violates the single-client restriction.
 *
 * PREFER using the combined `all.test.ts` instead — it shares one
 * connection for all tests within a single `describe` block.
 *
 * Captures viewport-sized screenshots of every Settings page:
 * General, Safari Protection, Filters, Advanced Blocking, User Rules,
 * Theme, Quit Reaction, License, Support, and About.
 *
 * @module VisualTests/Settings/Pages
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
 * Visual tests need more time for screenshot capture and comparison.
 *
 * @returns Timeout duration in milliseconds.
 */
function getTimeoutMs(): number {
    const fromEnv = parseInt(process.env.E2E_TIMEOUT || '', 10);
    return Number.isFinite(fromEnv) ? fromEnv : 15_000;
}

/**
 * Screenshot specifications for full-page captures.
 *
 * Navigates to each Settings page by clicking the sidebar menu item,
 * then captures a viewport-sized screenshot. Sub-pages (filters,
 * theme, quit-reaction) require an additional click on the general
 * settings page.
 *
 * @type {ScreenshotSpec[]}
 */
const PAGE_SCREENSHOTS: ScreenshotSpec[] = [
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

describe('Visual: Settings pages', () => {
    let driver: SciterDriver;
    const timeoutMs = getTimeoutMs();
    const results: VisualTestResult[] = [];

    before(async () => {
        driver = await connectWithRetry(MODULES.settings, timeoutMs);
    });

    after(async () => {
        await driver?.disconnect();
        // Print summary
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
     * Pages that are sub-pages accessible from the Settings general page.
     * For these, we first navigate to the general page, then click the
     * sub-page link on that page.
     */
    const SUB_PAGE_NAV: Record<string, string> = {
        'settings-filters-page': '#settings-general-filters',
        'settings-theme-page': '#settings-general-theme',
        'settings-quit-reaction-page': '#settings-general-quit-reaction',
    };

    for (const spec of PAGE_SCREENSHOTS) {
        it(`${spec.pageId} full-page screenshot`, { timeout: timeoutMs }, async () => {
            // Navigate if needed
            if (spec.navigate?.click) {
                const btn = await driver.findElement(spec.navigate.click);
                await btn.click();
                await new Promise((r) => setTimeout(r, 400));
            }

            // Handle sub-page navigation (e.g., filters, theme, quit-reaction)
            // These are opened by clicking a link on the general settings page
            const subPageSelector = SUB_PAGE_NAV[spec.pageId];
            if (subPageSelector) {
                const subPageBtn = await driver.findElement(subPageSelector);
                await subPageBtn.click();
                await new Promise((r) => setTimeout(r, 400));
            }

            const result = await captureAndCompare(driver, spec, 'settings');
            results.push(result);

            if (result.status === 'FAIL') {
                const pct = (result.diffPercent * 100).toFixed(2);
                assert.fail(
                    `Screenshot mismatch: ${result.diffPixels}/${result.totalPixels} `
                    + `pixels differ (${pct}%)`,
                );
            } else if (result.status === 'NEW') {
                // NEW is not a failure — first run creates baselines
                console.log(`  [NEW] No baseline for ${result.screenshotName}, saved as candidate`);
            } else if (result.status === 'ERROR') {
                assert.fail(`Screenshot error: ${result.error}`);
            }
            // PASS: do nothing
        });
    }
});
