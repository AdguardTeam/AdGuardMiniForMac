// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { onTestFinished, test } from 'vitest';

import { render } from 'preact';

import { Template } from '../../../modules/common/views/EnableExtensions/Template';


/**
 * Waits for preact's effect flush and the re-render it may trigger.
 */
function tick() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(resolve, 0);
            });
        });
    });
}

test('the onboarding page heading is announced without becoming a tab stop', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(
        <Template
            buttons={[{ buttonType: 'submit', label: 'Continue', action: () => {} }]}
            description="Description"
            image="image.png"
            title="Title"
        />,
        container,
    );

    onTestFinished(() => {
        render(null, container);
        container.remove();
    });

    await tick();

    const heading = container.querySelector('[data-text-type="h4"]');
    assert.ok(heading, 'the heading renders');
    assert.equal(heading.getAttribute('tabindex'), '-1', 'the heading stays out of the tab order');
    assert.equal(document.activeElement, heading, 'the heading is focused to announce the page');
});
