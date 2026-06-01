// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Element-level (component) visual regression tests for Settings.
 *
 * This is a **fallback** file for environments where the combined
 * `all.test.ts` cannot be used. Separate files each create their own
 * SciterDriver connection, which violates the single-client restriction.
 *
 * PREFER using the combined `all.test.ts` instead — it shares one
 * connection for all tests within a single `describe` block.
 *
 * Captures individual interactive components: protection toggles,
 * sidebar menu items, theme links, and the reset settings modal.
 *
 * @module VisualTests/Settings/Components
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
 * Screenshot specifications for element-level (component) captures.
 *
 * Each entry targets a specific interactive element on a settings page:
 * toggles (protection, startup), sidebar menu items, and conditionally
 * rendered modals (reset). The `navigate` field ensures the correct
 * page is visible before capture; the `setup` eval code opens modals.
 *
 * @type {ScreenshotSpec[]}
 */
const COMPONENT_SCREENSHOTS: ScreenshotSpec[] = [
    // General page elements
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
    // Safari Protection toggles
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
    // Menu items (sidebar)
    {
        name: 'menu-items', type: 'element', pageId: 'settings-general-page',
        selector: '#settings-menu-safari-protection',
        navigate: { click: '#settings-menu-settings' },
    },
    // Modal: open reset modal and capture it
    // Opens the header context menu, clicks "Reset to default", then captures the modal
    {
        name: 'reset-modal', type: 'element', pageId: 'settings-general-page',
        selector: '#settings-general-reset-modal',
        navigate: { click: '#settings-menu-settings' },
    },
];

describe('Visual: Settings components', () => {
    let driver: SciterDriver;
    const timeoutMs = getTimeoutMs();
    const results: VisualTestResult[] = [];

    before(async () => {
        driver = await connectWithRetry(MODULES.settings, timeoutMs);
    });

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

    for (const spec of COMPONENT_SCREENSHOTS) {
        it(`${spec.pageId} -- ${spec.name}`, { timeout: timeoutMs }, async () => {
            // Navigate if needed
            if (spec.navigate?.click) {
                const btn = await driver.findElement(spec.navigate.click);
                await btn.click();
                await new Promise((r) => setTimeout(r, 400));
            }

            // Special handling for reset-modal: open the context menu and click "Reset to default"
            if (spec.name === 'reset-modal') {
                // Step 1: Open the context menu by clicking the icon-only button
                // Use getAttribute('type') instead of .type (not supported in Sciter's QuickJS)
                await driver.eval(`
                    (() => {
                        const page = document.querySelector('#settings-general-page');
                        if (!page) return;
                        // Find the context menu trigger: first icon-only button in the page
                        // (no visible text content, has child elements like SVG)
                        const buttons = page.querySelectorAll('button');
                        for (const btn of buttons) {
                            const text = (btn.textContent || '').trim();
                            if (!text && btn.children.length > 0) {
                                btn.dispatchEvent(new Event('click', { bubbles: true }));
                                break;
                            }
                        }
                    })();
                `);
                await new Promise((r) => setTimeout(r, 400));

                // Step 2: Click "Reset to default" menu item
                await driver.eval(`
                    (() => {
                        const items = document.querySelectorAll('[role="button"]');
                        for (const item of items) {
                            const text = item.textContent || '';
                            if (text.includes('Reset to default')) {
                                item.dispatchEvent(new Event('click', { bubbles: true }));
                                break;
                            }
                        }
                    })();
                `);
                await new Promise((r) => setTimeout(r, 500));
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
                console.log(`  [NEW] No baseline for ${result.screenshotName}, saved as candidate`);
            } else if (result.status === 'ERROR') {
                assert.fail(`Screenshot error: ${result.error}`);
            }
        });
    }
});
