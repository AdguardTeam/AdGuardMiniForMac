// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { onTestFinished, test } from 'vitest';

import { render } from 'preact';

import { Text } from '../../../modules/common/components/Text/Text';

/**
 * Renders the text into a fresh container and registers its teardown.
 */
function mountText(props: Parameters<typeof Text>[0]) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(<Text {...props} />, container);

    onTestFinished(() => {
        render(null, container);
        container.remove();
    });

    return container;
}

test('programmatically focused text stays ringless', () => {
    const container = mountText({
        children: 'Heading',
        id: 'heading',
        tabIndex: -1,
        type: 'h4',
    });

    const heading = container.querySelector('h4');
    assert.ok(heading, 'the heading renders');
    assert.equal(heading.getAttribute('tabindex'), '-1', 'the heading is focusable programmatically');
    assert.equal(
        heading.classList.contains('Text_control'),
        false,
        'a programmatic focus target carries no focus-ring control class',
    );
});

test('a deliberate tab stop keeps the focus-ring control class', () => {
    const container = mountText({
        children: 'Tab stop',
        tabIndex: 0,
        type: 'h4',
    });

    const heading = container.querySelector('h4');
    assert.ok(heading, 'the heading renders');
    assert.equal(
        heading.classList.contains('Text_control'),
        true,
        'a keyboard tab stop carries the focus-ring control class',
    );
});
