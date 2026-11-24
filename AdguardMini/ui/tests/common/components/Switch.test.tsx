// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { onTestFinished, test } from 'vitest';

import { render } from 'preact';

import { Switch } from '../../../modules/common/components/Switch/Switch';


/**
 * Renders the switch into a fresh container and registers its teardown.
 */
function mountSwitch(props: Parameters<typeof Switch>[0]) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(<Switch {...props} />, container);

    onTestFinished(() => {
        render(null, container);
        container.remove();
    });

    return container;
}

test('an enabling switch carries the in-progress state and ignores clicks', () => {
    const changes: boolean[] = [];
    const container = mountSwitch({
        checked: true,
        enabling: true,
        onChange: (value) => changes.push(value),
    });

    const label = container.querySelector('[role="switch"]') as HTMLElement;
    assert.ok(label.classList.contains('enablingSwitch'), 'the in-progress state is applied');
    assert.ok(label.classList.contains('disabledSwitch'), 'the enabling switch is disabled');
    assert.equal((container.querySelector('input') as HTMLInputElement).disabled, true);

    label.click();
    assert.deepEqual(changes, [], 'a click does not toggle the enabling switch');
});

test('a disabled switch without the enabling state keeps the plain disabled look', () => {
    const container = mountSwitch({
        checked: true,
        disabled: true,
        onChange: () => {},
    });

    const label = container.querySelector('[role="switch"]') as HTMLElement;
    assert.ok(label.classList.contains('disabledSwitch'), 'the disabled state is applied');
    assert.equal(
        label.classList.contains('enablingSwitch'),
        false,
        'a plain disabled switch carries no in-progress state',
    );
});

test('an idle switch toggles on click', () => {
    const changes: boolean[] = [];
    const container = mountSwitch({
        checked: false,
        onChange: (value) => changes.push(value),
    });

    const label = container.querySelector('[role="switch"]') as HTMLElement;
    label.click();

    // jsdom fires the wrapped input's activation click as well, so the count is
    // not asserted; the reported state is.
    assert.ok(changes.length > 0, 'the click reports the new state');
    assert.equal(changes.every((value) => value === true), true, 'the reported state is the new one');
});
