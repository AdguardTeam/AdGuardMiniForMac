// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../mocks/domEnvironment';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { render } from 'preact';

import { Troubleshooting } from 'Modules/settings/components/SystemWideProtection/components/Troubleshooting';

import type { RefObject } from 'preact';

type TestHooks = { after(callback: () => void): void };

const DNS_KEY = 'advanced.blocking.system.wide.part.troubleshooting.dns';

/**
 * Messages used by the cases: the rendered copy is irrelevant to the
 * component's contract, only the `<link>` tags it wires actions into matter.
 */
const messages: Record<string, string> = {
    'advanced.blocking.system.wide.part.troubleshooting': 'Troubleshooting',
    'advanced.blocking.system.wide.part.troubleshooting.desc': 'Try the steps',
    'advanced.blocking.system.wide.part.troubleshooting.connection': 'Check your Internet connection',
    'advanced.blocking.system.wide.part.troubleshooting.restart': 'Restart your Mac',
    'advanced.blocking.system.wide.part.troubleshooting.reset.cache': '<link>Reset the filter cache</link>. This may help',
    'advanced.blocking.system.wide.part.troubleshooting.reinstall': 'Reinstall the URL filter. <link>Remove it</link>, then enable it again',
    'advanced.blocking.system.wide.part.troubleshooting.support': 'If protection is still unavailable, <link>contact support</link>',
};

/**
 * Builds the DNS step the way the translator renders it: a lead-in, the
 * `<br>`-separated hosts, and the trailing sentence.
 */
function dnsMessage() {
    return [
        <b>Check your DNS filtering settings.</b>,
        ' DNS filters can block Apple services needed for System-wide protection. If you use DNS filtering on your Mac, router, or network, make sure it allows these domains:',
        <br />,
        'gateway.icloud.com',
        <br />,
        'mask.icloud.com',
        <br />,
        'mask-h2.icloud.com',
        <br />,
        'Allow them in the DNS service or app that blocks them',
    ];
}

/**
 * Installs a `translate` stub that resolves the messages above and applies
 * the tag renderers the component passes, as the real translator does.
 */
function installTranslate() {
    (globalThis as unknown as { translate: unknown }).translate = (
        key: string,
        params: { link?(text: string): unknown } = {},
    ) => {
        if (key === DNS_KEY) {
            return dnsMessage();
        }

        const message = messages[key] ?? key;
        const parts: unknown[] = [];
        const linkPattern = /<link>(.*?)<\/link>/g;
        let lastIndex = 0;
        let match = linkPattern.exec(message);
        while (match !== null) {
            if (match.index > lastIndex) {
                parts.push(message.slice(lastIndex, match.index));
            }
            parts.push(params.link?.(match[1]) ?? match[1]);
            lastIndex = match.index + match[0].length;
            match = linkPattern.exec(message);
        }
        parts.push(message.slice(lastIndex));

        return parts;
    };
}

/**
 * Renders the block into a fresh container and registers its teardown.
 *
 * @param testContext Test hooks used to unregister the teardown.
 * @param onCall Records the action a step link runs.
 * @param isInstalled Whether the filter is installed.
 * @param blockRef Optional ref the page passes to scroll the block into view.
 */
function mountTroubleshooting(
    testContext: TestHooks,
    onCall: (action: string) => void,
    isInstalled = true,
    blockRef?: RefObject<HTMLDivElement>,
) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(
        <Troubleshooting
            blockRef={blockRef}
            isInstalled={isInstalled}
            setShowRemoveFilterModal={() => onCall('removeFilter')}
            setShowResetCacheModal={() => onCall('resetCache')}
            onContactSupport={() => onCall('contactSupport')}
        />,
        container,
    );

    testContext.after(() => {
        render(null, container);
        container.remove();
    });

    return container;
}

test('renders the troubleshooting steps', (testContext) => {
    installTranslate();
    const container = mountTroubleshooting(testContext, () => {});

    assert.equal(container.querySelectorAll('li').length, 6, 'all six steps are rendered');
    assert.match(container.textContent ?? '', /gateway\.icloud\.com/, 'the DNS step lists the iCloud hosts');
});

test('wraps the DNS host list in its own selection root', (testContext) => {
    installTranslate();
    const container = mountTroubleshooting(testContext, () => {});

    const dnsStep = container.querySelectorAll('li')[1];
    assert.ok(dnsStep, 'the DNS step is rendered');

    const hosts = dnsStep.querySelector('.Troubleshooting_domains');
    assert.ok(hosts, 'the host list is wrapped inside the DNS step');
    assert.match(
        hosts.textContent ?? '',
        /gateway\.icloud\.commask\.icloud\.commask-h2\.icloud\.com/,
        'the wrapper carries all three hosts',
    );
    assert.equal(hosts.querySelectorAll('br').length, 2, 'the line breaks stay inside the wrapper');
    assert.doesNotMatch(hosts.textContent ?? '', /Check your DNS/, 'the lead-in stays outside the wrapper');
    assert.doesNotMatch(hosts.textContent ?? '', /Allow them/, 'the trailing sentence stays outside the wrapper');
});

test('the step links run their actions', (testContext) => {
    installTranslate();
    const calls: string[] = [];
    const container = mountTroubleshooting(testContext, (action) => calls.push(action));

    const links = container.querySelectorAll('[role="button"]');
    assert.equal(links.length, 3, 'the steps carry the reset, remove, and support links');

    (links[0] as HTMLElement).click();
    assert.deepEqual(calls, ['resetCache'], 'the reset link opens the cache reset modal');

    (links[1] as HTMLElement).click();
    assert.deepEqual(calls, ['resetCache', 'removeFilter'], 'the remove link opens the filter removal modal');

    (links[2] as HTMLElement).click();
    assert.deepEqual(calls, ['resetCache', 'removeFilter', 'contactSupport'], 'the support link opens the support screen');
});

test('exposes the steps block through the ref for scrolling', (testContext) => {
    installTranslate();
    const blockRef: RefObject<HTMLDivElement> = { current: null };
    const container = mountTroubleshooting(testContext, () => {}, true, blockRef);

    assert.ok(blockRef.current, 'the block ref is attached');
    assert.equal(blockRef.current, container.firstElementChild, 'the ref points to the steps block');
    assert.match(blockRef.current?.textContent ?? '', /Troubleshooting/, 'the block carries the steps');
});

test('disables the reset and remove links when the filter is not installed', (testContext) => {
    installTranslate();
    const calls: string[] = [];
    const container = mountTroubleshooting(testContext, (action) => calls.push(action), false);

    assert.equal(container.querySelectorAll('li').length, 6, 'the steps stay readable');
    assert.match(container.textContent ?? '', /Reset the filter cache/, 'the reset step is not hidden');

    const links = container.querySelectorAll('[role="button"]');
    assert.equal(links.length, 1, 'only the support link stays interactive');

    (links[0] as HTMLElement).click();
    assert.deepEqual(calls, ['contactSupport'], 'the support link still opens the support screen');
});
