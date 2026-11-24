// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { onTestFinished, test } from 'vitest';

import { render } from 'preact';

import { UserRuleTitleActions } from 'Modules/settings/components/UserRule/UserRuleTitleActions';


/**
 * Renders the heading actions into a fresh container and registers teardown.
 *
 * @param canDelete Whether the edited rule can be removed.
 * @param onDelete Records the delete action.
 */
function mountActions(canDelete: boolean, onDelete: () => void) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(<UserRuleTitleActions canDelete={canDelete} onDelete={onDelete} />, container);

    onTestFinished(() => {
        render(null, container);
        container.remove();
    });

    return container;
}

/**
 * Waits for preact to flush the state update that opens the menu.
 */
async function flushRender() {
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

test('offers only the report flag when the rule cannot be deleted', () => {
    const container = mountActions(false, () => {});

    const buttons = container.querySelectorAll('button');
    assert.equal(buttons.length, 1, 'the create page has no context menu trigger');
    assert.equal(buttons[0].getAttribute('data-icon'), 'flag', 'the remaining control is the report flag');
    assert.equal(container.querySelector('[role="button"]'), null, 'no action row is rendered');
});

test('offers the delete action for an edited rule', async () => {
    let deleted = 0;
    const container = mountActions(true, () => {
        deleted += 1;
    });

    const buttons = container.querySelectorAll('button');
    assert.equal(buttons.length, 2, 'the flag and the context menu are separate controls');
    assert.equal(buttons[1].getAttribute('data-icon'), 'context', 'the second control opens the action menu');

    buttons[1].click();
    await flushRender();

    const action = container.querySelector('[role="button"]');
    assert.ok(action, 'the context menu opens');
    assert.equal(action.textContent, 'delete', 'the menu carries the delete action');

    (action as HTMLElement).click();
    assert.equal(deleted, 1, 'the delete action reaches the page handler');
});
