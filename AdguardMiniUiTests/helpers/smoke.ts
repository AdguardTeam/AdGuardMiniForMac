// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Generic smoke test generator for Sciter UI modules.
 *
 * Reads a page flow manifest (from test-ids.json) and auto-generates
 * node:test suites that verify every page container and its declared
 * test IDs are present and visible in the DOM.
 *
 * Usage:
 *   runSmokeTests(MODULES.settings, manifest);
 *
 * No per-test code needed when adding new elements — just update
 * test-ids.json and the IDs are picked up automatically.
 *
 * @module TestHelpers/Smoke
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SciterDriver } from '@adg/sciter-test-driver';
import { connectWithRetry } from './driver.ts';
import type { ModuleConfig } from './driver.ts';

/**
 * Navigation instruction for reaching a page before checking its elements.
 */
interface PageNavigate {
    /** CSS selector (with leading #) of a menu item to click. */
    click?: string;
    /** JavaScript expression to evaluate for navigation. */
    eval?: string;
}

/**
 * Describes a single page in the test flow.
 */
interface PageSpec {
    /** DOM id of the page container (e.g. 'settings-general-page'). */
    pageId: string;
    /** Optional navigation to reach this page. */
    navigate?: PageNavigate;
    /** Array of test IDs to verify on this page. */
    elements: string[];
}

/**
 * Module-level manifest, matching the structure in test-ids.json.
 */
interface ModuleManifest {
    /** Ordered list of pages to test. */
    flow: PageSpec[];
    /** If true, this module runs in its own window (doesn't coexist with others). */
    standalone?: boolean;
}

/**
 * Top-level test ID manifest that maps module names to their flow.
 */
interface TestIdManifest {
    [moduleName: string]: ModuleManifest;
}

/**
 * Reads the per-test timeout from the E2E_TIMEOUT environment variable.
 * Falls back to 10 seconds if unset or invalid.
 */
function getTimeoutMs(): number {
    const fromEnv = parseInt(process.env.E2E_TIMEOUT || '', 10);
    return Number.isFinite(fromEnv) ? fromEnv : 10_000;
}

/**
 * Performs a navigation step using either a click or an eval expression.
 *
 * @param driver - Connected SciterDriver.
 * @param nav    - Navigation instruction.
 */
async function navigateToPage(
    driver: SciterDriver,
    nav: PageNavigate,
): Promise<void> {
    if (nav.eval) {
        // Evaluate arbitrary JS in the Sciter context.
        // Used for complex navigation that can't be done with a single click.
        await driver.eval(nav.eval);
        await new Promise((r) => setTimeout(r, 200));
    } else if (nav.click) {
        // Click a menu or link element identified by its DOM id.
        // Note: nav.click is the testId WITHOUT the leading '#' (e.g.,
        // 'settings-menu-settings' not '#settings-menu-settings').
        const btn = await driver.findElement(`#${nav.click}`);
        await btn.click();
        await new Promise((r) => setTimeout(r, 300));
    }
}

/**
 * Registers smoke tests that walk through a page flow.
 *
 * Connects once to the module's test peer, then iterates through
 * each page in the manifest flow, performing navigation and verifying
 * that the page container and all declared elements are visible.
 *
 * @param config   - Module connection configuration (port + name).
 * @param manifest - Full test ID manifest (from test-ids.json).
 */
export function runSmokeTests(
    config: ModuleConfig,
    manifest: TestIdManifest,
): void {
    const moduleManifest = manifest[config.name];

    if (!moduleManifest || moduleManifest.flow.length === 0) {
        // No pages to test — emit a placeholder so the suite doesn't
        // complain about an empty describe block.
        describe(`Smoke tests: ${config.name}`, () => {
            it('no pages in manifest (skip)', () => {});
        });
        return;
    }

    describe(`Smoke tests: ${config.name}`, () => {
        /** Shared SciterDriver instance reused across all pages. */
        let driver: SciterDriver;
        const timeoutMs = getTimeoutMs();

        before(async () => {
            driver = await connectWithRetry(config, timeoutMs);
        });

        after(async () => {
            await driver?.disconnect();
        });

        // Register a nested describe for each page in the flow.
        for (const pageSpec of moduleManifest.flow) {
            describe(`Page: ${pageSpec.pageId}`, () => {
                // Navigation step: execute if the manifest specifies one.
                if (pageSpec.navigate) {
                    it('navigate to page', { timeout: timeoutMs }, async () => {
                        await navigateToPage(driver, pageSpec.navigate);
                    });
                }

                // Verify the page container div is visible.
                it(`container #${pageSpec.pageId} is visible`, { timeout: timeoutMs }, async () => {
                    const pageEl = await driver.waitForElement(
                        `#${pageSpec.pageId}`,
                        { timeout: 5000 },
                    );
                    const visible = await pageEl.isVisible();
                    assert.ok(visible, `Page container #${pageSpec.pageId} is not visible`);
                });

                // Verify each declared element is present and visible.
                for (const testId of pageSpec.elements) {
                    it(`#${testId} is visible`, { timeout: timeoutMs }, async () => {
                        const el = await driver.findElement(`#${testId}`);
                        const visible = await el.isVisible();
                        assert.ok(
                            visible,
                            `Element #${testId} not visible on ${pageSpec.pageId}`,
                        );
                    });
                }
            });
        }
    });
}
