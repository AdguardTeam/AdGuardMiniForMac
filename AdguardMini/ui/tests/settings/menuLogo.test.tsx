// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { onTestFinished, test } from 'vitest';

import { render } from 'preact';

import { MenuLogo } from 'Modules/settings/components/Menu/components/MenuLogo';
import { store, __resetSettingsTestStore } from 'SettingsStore';
import { RouteName } from 'SettingsStore/modules';


/**
 * Installs a `translate` stub that resolves the control's composed aria label.
 */
function installTranslate() {
    (globalThis as unknown as { translate: unknown }).translate = (
        key: string,
        params: { text?: string } = {},
    ) => {
        if (key === 'menu.safari.protection') {
            return 'Safari protection';
        }

        if (key === 'aria.elements.navigation') {
            return `Navigate to: ${params.text}`;
        }

        return key;
    };
}

/**
 * Renders the logo into a fresh container, wires the navigation recording, and
 * registers the teardown.
 *
 * @param changePath Records the route the logo navigates to.
 */
function mountMenuLogo(changePath: (path: string) => void): HTMLElement {
    installTranslate();
    __resetSettingsTestStore();
    store.router = { changePath };

    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<MenuLogo isDarkTheme={false} />, container);

    onTestFinished(() => {
        render(null, container);
        container.remove();
        __resetSettingsTestStore();
    });

    const logo = container.querySelector<HTMLElement>('[role="button"]');
    assert.ok(logo, 'the logo is rendered as a control');

    return logo;
}

test('the logo opens Safari protection on click', () => {
    const navigated: string[] = [];
    const logo = mountMenuLogo((path) => navigated.push(path));

    logo.click();

    assert.deepEqual(navigated, [RouteName.safari_protection], 'the click selects the main screen');
});

test('the whole logo area activates the control', () => {
    const navigated: string[] = [];
    const logo = mountMenuLogo((path) => navigated.push(path));
    const image = logo.querySelector('[data-logo]');
    assert.ok(image, 'the logo image is inside the control');

    (image as HTMLElement).click();

    assert.deepEqual(navigated, [RouteName.safari_protection], 'a click on the logo image activates the control');
});

test('the logo exposes an accessible navigation label', () => {
    const logo = mountMenuLogo(() => {});

    assert.equal(logo.getAttribute('tabindex'), '0', 'the logo is in the tab order');
    assert.equal(
        logo.getAttribute('aria-label'),
        'Navigate to: Safari protection',
        'the label states the destination',
    );
});

test('Enter and Space activate the logo, other keys do not', () => {
    const navigated: string[] = [];
    const logo = mountMenuLogo((path) => navigated.push(path));

    logo.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Enter' }));
    logo.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Space' }));
    logo.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyA' }));

    assert.deepEqual(
        navigated,
        [RouteName.safari_protection, RouteName.safari_protection],
        'only Enter and Space navigate',
    );
});
