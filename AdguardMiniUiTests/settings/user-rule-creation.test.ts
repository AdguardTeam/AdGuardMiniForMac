// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview User rule creation workflow tests for the Settings module.
 *
 * End-to-end test that simulates creating a blocking rule through the
 * User Rules editor:
 *   1. Navigate to the User Rules list page
 *   2. Open the rule editor (click "Create rule")
 *   3. Fill the domain input field
 *   4. Select a content type from the Dropdown
 *   5. Set the "Apply to websites" modifier via native Select
 *   6. Verify the preview text shows the compiled rule
 *   7. Submit the rule and verify it appears in the rules list
 *
 * Interacts with both custom Sciter components (Dropdown) and native
 * form elements (Select, checkbox, input).
 *
 * @module WorkflowTests/UserRuleCreation
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SciterDriver } from '@adg/sciter-test-driver';
import { connectWithRetry, MODULES } from '../helpers/driver.ts';

/**
 * Reads the per-test timeout from the E2E_TIMEOUT environment variable.
 * Falls back to 15 seconds if unset or invalid.
 * User rule tests need more time due to multi-step interactions.
 *
 * @returns Timeout duration in milliseconds.
 */
function getTimeoutMs(): number {
    const fromEnv = parseInt(process.env.E2E_TIMEOUT || '', 10);
    return Number.isFinite(fromEnv) ? fromEnv : 15_000;
}

/**
 * Navigates to the User Rules list page via the settings menu.
 */
async function navigateToUserRules(driver: SciterDriver): Promise<void> {
    const menuItem = await driver.findElement('#settings-menu-user-rules');
    await menuItem.click();
    await new Promise((r) => setTimeout(r, 300));
}

/**
 * Clicks the "Create rule" button on the User Rules list page.
 */
async function clickCreateRule(driver: SciterDriver): Promise<void> {
    const addRuleBtn = await driver.findElement('#settings-user-rules-add-rule');
    await addRuleBtn.click();
    await new Promise((r) => setTimeout(r, 300));
}

/**
 * Fills the domain input on the Block rule form.
 */
async function fillDomain(driver: SciterDriver, domain: string): Promise<void> {
    const input = await driver.findElement('#search');
    await input.setValue(domain);
    await new Promise((r) => setTimeout(r, 100));
}

/**
 * Index of each option in the content-type Dropdown, matching
 * `getContentBlockOptions()` order.
 */
const CONTENT_TYPE_INDEX: Record<string, number> = {
    All: 0,
    'Web pages': 1,
    Images: 2,
    CSS: 3,
    Scripts: 4,
    Fonts: 5,
    Media: 6,
    XMLHttpRequest: 7,
    Other: 8,
};

/**
 * Index of each option in the "Apply to websites" native Select, matching
 * `getDomainOptions()` order.
 */
const DOMAIN_MODIFIER_INDEX: Record<string, number> = {
    all: 0,
    onlyThis: 1,
    allOther: 2,
    onlyListed: 3,
    allExceptListed: 4,
};

/**
 * Selects a content type option in the content-type Dropdown.
 *
 * The Dropdown is a `<div id="type">` whose first child `<div>` is the
 * clickable header.  The `<li>` options are regular DOM elements with click
 * handlers, so they can be targeted by index via `findElements`.
 */
async function selectContentType(
    driver: SciterDriver,
    label: string,
): Promise<void> {
    // Open the dropdown by clicking the header div
    const header = await driver.findElement('div[id="type"] > div');
    await header.click();
    await new Promise((r) => setTimeout(r, 300));

    // Click the <li> whose text matches the label
    const idx = CONTENT_TYPE_INDEX[label];
    if (idx === undefined) {
        throw new Error(`Unknown content type label: "${label}"`);
    }
    const lis = await driver.findElements('div[id="type"] li');
    await lis[idx].click();
    await new Promise((r) => setTimeout(r, 300));
}

/**
 * Selects a domain modifier option in the "Apply to websites" native Select.
 *
 * The Select is a native `<select id="type">`.  The test peer's
 * `setElementValue` command sets `.value` *and* dispatches `input`/`change`
 * events, which triggers the React change handler.
 */
async function selectWebsitesOption(
    driver: SciterDriver,
    optionValue: string,
): Promise<void> {
    const select = await driver.findElement('select[id="type"]');
    await select.setValue(optionValue);
    await new Promise((r) => setTimeout(r, 300));
}

/**
 * Toggles the "High priority" checkbox on.
 *
 * The high-priority checkbox `<input type="checkbox">` is the only one not
 * nested inside a Dropdown `<li>`, so `:not(li)` scopes the selector.
 */
async function enableHighPriority(driver: SciterDriver): Promise<void> {
    const checkbox = await driver.findElement(
        ':not(li) input[type="checkbox"]',
    );
    await checkbox.click();
    await new Promise((r) => setTimeout(r, 200));
}

/**
 * Reads the preview rule text from the RuleHighlighter token elements.
 */
async function getPreviewText(driver: SciterDriver): Promise<string> {
    const tokens = await driver.findElements(
        '[class*="RuleHighlighter_token"]',
    );
    if (tokens.length === 0) {
        return '';
    }
    const texts = await Promise.all(
        tokens.map((el) => el.getText()),
    );
    return texts.join('');
}

/**
 * Clicks the "Create" (or "Save") submit button.
 */
async function clickCreateButton(driver: SciterDriver): Promise<void> {
    const btn = await driver.findElement('#settings-user-rule-create');
    await btn.click();
    await new Promise((r) => setTimeout(r, 500));
}

/**
 * Gets the list of displayed rule texts from the User Rules list page.
 */
async function getRuleTexts(driver: SciterDriver): Promise<string[]> {
    const rules = await driver.findElements(
        '#settings-user-rules-page [class*="Rule"], '
        + '#settings-user-rules-page [class*="rule"]',
    );
    const texts = await Promise.all(
        rules.map((el) => el.getText()),
    );
    return texts.map((t) => t.trim()).filter(Boolean);
}

describe('User rule creation', () => {
    let driver: SciterDriver;
    let previewText: string;
    const timeoutMs = getTimeoutMs();

    before(async () => {
        driver = await connectWithRetry(MODULES.settings, timeoutMs);
    });

    after(async () => {
        await driver?.disconnect();
    });

    it('navigates to User Rules page', { timeout: timeoutMs }, async () => {
        await navigateToUserRules(driver);

        const pageEl = await driver.waitForElement(
            '#settings-user-rules-page',
            { timeout: 5000 },
        );
        const visible = await pageEl.isVisible();
        assert.ok(visible, 'User Rules page is not visible');
    });

    it('opens the rule editor', { timeout: timeoutMs }, async () => {
        await clickCreateRule(driver);

        // After clicking we should be on the user-rule editor page.
        await new Promise((r) => setTimeout(r, 300));
        const typeSelect = await driver.findElement('#rule_type');
        const visible = await typeSelect.isVisible();
        assert.ok(visible, 'Rule editor did not open (rule type selector not visible)');
    });

    it('fills the domain field', { timeout: timeoutMs }, async () => {
        await fillDomain(driver, 'example.com');

        const input = await driver.findElement('#search');
        const value = await input.getValue();
        assert.equal(value, 'example.com');
    });

    it('sets content type to "Images"', { timeout: timeoutMs }, async () => {
        await selectContentType(driver, 'Images');
    });

    it('sets "Apply to websites" to "Only this"', { timeout: timeoutMs }, async () => {
        await selectWebsitesOption(driver, 'onlyThis');
    });

    it('reads the preview text', { timeout: timeoutMs }, async () => {
        previewText = await getPreviewText(driver);
        assert.ok(
            previewText.length > 0,
            `Preview text should not be empty, got: "${previewText}"`,
        );
    });

    it('clicks Create and returns to User Rules page', { timeout: timeoutMs }, async () => {
        await clickCreateButton(driver);

        const pageEl = await driver.waitForElement(
            '#settings-user-rules-page',
            { timeout: 5000 },
        );
        const visible = await pageEl.isVisible();
        assert.ok(visible, 'Did not return to User Rules page after creating rule');
    });

    it('shows the new rule in the rules list', { timeout: timeoutMs }, async () => {
        const ruleTexts = await getRuleTexts(driver);

        const matchingRule = ruleTexts.find(
            (text: string) => text.includes('example.com'),
        );
        assert.ok(
            matchingRule,
            `New rule matching "example.com" not found in rules list. Rules: ${JSON.stringify(ruleTexts)}`,
        );
    });
});
