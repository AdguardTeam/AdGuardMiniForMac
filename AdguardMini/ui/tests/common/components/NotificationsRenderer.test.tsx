// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../../mocks/domEnvironment';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { render } from 'preact';
import { createPortal } from 'preact/compat';
import { useState } from 'preact/hooks';

import { NotificationsRenderer } from '../../../modules/common/components/NotificationsRenderer/NotificationsRenderer';
import {
    NotificationContext,
    NotificationsQueue,
    NotificationsQueueIconType,
    NotificationsQueueType,
} from '../../../modules/common/stores/NotificationsQueue';

import type { InfoNotificationProperties } from '../../../modules/common/stores/NotificationsQueue';

type RerenderTrigger = { current(): void };

/** Test context surface used for teardown registration. */
type TestHooks = { after(callback: () => void): void };

/**
 * Host that re-renders its portal subtree on demand, the way a module App
 * does on navigation.
 */
function Host({ notification, trigger }: { notification: NotificationsQueue; trigger: RerenderTrigger }) {
    const [, setRevision] = useState(0);

    trigger.current = () => {
        setRevision((revision) => revision + 1);
    };

    return (
        <div className="host">
            {createPortal(
                <NotificationsRenderer className="TestNotificationsContainer" notification={notification} />,
                document.getElementById('notify')!,
            )}
        </div>
    );
}

/**
 * Renders the host into a fresh container and registers its teardown.
 */
function mountHost(testContext: TestHooks, queue: NotificationsQueue) {
    const notifyContainer = document.getElementById('notify')!;
    const appContainer = document.createElement('div');
    document.body.appendChild(appContainer);

    const trigger: RerenderTrigger = { current: () => {} };
    render(<Host notification={queue} trigger={trigger} />, appContainer);

    testContext.after(() => {
        render(null, appContainer);
        appContainer.remove();
        notifyContainer.innerHTML = '';
    });

    return { notifyContainer, trigger };
}

/**
 * Records insertions and removals on the portal container.
 */
function trackContainerMutations(container: HTMLElement) {
    const mutations: string[] = [];
    const describeNode = (node: Node) => (node as Element).className || node.nodeName;

    const appendChild = container.appendChild.bind(container);
    container.appendChild = ((node: Node) => {
        mutations.push(`append ${describeNode(node)}`);
        return appendChild(node);
    }) as typeof container.appendChild;

    const insertBefore = container.insertBefore.bind(container);
    container.insertBefore = ((node: Node, reference: Node | null) => {
        mutations.push(`insert ${describeNode(node)}`);
        return insertBefore(node, reference);
    }) as typeof container.insertBefore;

    const removeChild = container.removeChild.bind(container);
    container.removeChild = ((node: Node) => {
        mutations.push(`remove ${describeNode(node)}`);
        return removeChild(node);
    }) as typeof container.removeChild;

    return mutations;
}

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

/**
 * Basic info notification properties. Notifications never expire in tests so
 * the auto-close timers do not keep the test process alive.
 */
function infoNotifyProps(overrides?: Partial<InfoNotificationProperties>): InfoNotificationProperties {
    return {
        message: 'App version copied',
        notificationContext: NotificationContext.info,
        iconType: NotificationsQueueIconType.done,
        type: NotificationsQueueType.success,
        timeout: false,
        ...overrides,
    };
}

test('a host re-render keeps the notifications DOM in place', async (testContext) => {
    const queue = new NotificationsQueue();
    queue.notify(infoNotifyProps());

    const { notifyContainer, trigger } = mountHost(testContext, queue);
    const toast = notifyContainer.querySelector('[class*="notificationWrap"]');
    assert.ok(toast, 'the notification is rendered');

    // Re-inserting the container detaches and re-attaches the toast, which
    // restarts its entrance animation in WebKit.
    const mutations = trackContainerMutations(notifyContainer);

    trigger.current();
    await tick();

    assert.deepEqual(mutations, [], 'a host re-render must not move the notifications DOM');
    assert.equal(
        notifyContainer.querySelector('[class*="notificationWrap"]'),
        toast,
        'the toast DOM node must stay the same',
    );
});

test('the renderer reacts to queue changes without a host re-render', async (testContext) => {
    const queue = new NotificationsQueue();

    const { notifyContainer } = mountHost(testContext, queue);
    assert.equal(
        notifyContainer.querySelector('[class*="notificationsContainer"]'),
        null,
        'nothing is rendered while the queue is empty',
    );

    const uuid = queue.notify(infoNotifyProps({ message: 'First notification' }));
    await tick();
    assert.match(notifyContainer.textContent ?? '', /First notification/);

    queue.closeNotify(uuid);
    await tick();
    assert.equal(
        notifyContainer.querySelector('[class*="notificationsContainer"]'),
        null,
        'the container is removed together with the last notification',
    );
});

test('the renderer closes a notification through the close button', async (testContext) => {
    const queue = new NotificationsQueue();
    queue.notify(infoNotifyProps());

    const { notifyContainer } = mountHost(testContext, queue);
    const closeButton = notifyContainer.querySelector('button');
    assert.ok(closeButton, 'the close button is rendered');

    closeButton.click();
    await tick();

    assert.equal(queue.queueLength, 0, 'the click closes the notification');
});
