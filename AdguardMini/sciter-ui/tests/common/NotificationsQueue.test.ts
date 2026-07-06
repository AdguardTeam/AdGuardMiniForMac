// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    NotificationsQueue,
    NotificationContext,
    NotificationsQueueIconType,
    NotificationsQueueType,
    DEFAULT_NOTIFY_LIFETIME,
} from '../../modules/common/stores/NotificationsQueue';

import type { InfoNotificationProperties } from '../../modules/common/stores/NotificationsQueue';

// Mock window.GenerateUuid for use in tests
// In Sciter runtime this is set by sciterBootstrap.ts: window.GenerateUuid = sciter.uuid
// In Node.js test environment we provide a simple UUID implementation
(globalThis as Record<string, unknown>).GenerateUuid ??= () => crypto.randomUUID();

/**
 * Helper to create a basic info notification
 */
function infoNotifyProps(
    overrides?: Partial<InfoNotificationProperties>,
): InfoNotificationProperties {
    return {
        message: 'Test notification',
        notificationContext: NotificationContext.info,
        iconType: NotificationsQueueIconType.info,
        type: NotificationsQueueType.success,
        ...overrides,
    };
}

test('starts with an empty queue', () => {
    const queue = new NotificationsQueue();

    assert.equal(queue.queueLength, 0);
});

test('notify() adds a notification and returns a uuid', () => {
    const queue = new NotificationsQueue();

    const uuid = queue.notify(infoNotifyProps());

    assert.ok(typeof uuid === 'string');
    assert.equal(queue.queueLength, 1);
});

test('get() returns the notification props holder by uuid', () => {
    const queue = new NotificationsQueue();

    const uuid = queue.notify(infoNotifyProps({ message: 'Hello' }));
    const holder = queue.get(uuid);

    assert.ok(holder !== undefined);
    assert.equal(holder.props.message, 'Hello');
});

test('closeNotify() removes a notification from the queue', () => {
    const queue = new NotificationsQueue();

    const uuid = queue.notify(infoNotifyProps());
    assert.equal(queue.queueLength, 1);

    queue.closeNotify(uuid);
    assert.equal(queue.queueLength, 0);
});

test('closeNotify() calls the onClose callback', () => {
    const queue = new NotificationsQueue();
    let called = false;

    const uuid = queue.notify(infoNotifyProps({
        onClose: () => { called = true; },
    }));

    queue.closeNotify(uuid);
    assert.equal(called, true);
});

test('closeNotify() does not throw when notification is not found', () => {
    const queue = new NotificationsQueue();

    assert.doesNotThrow(() => queue.closeNotify('nonexistent-uuid'));
});

test('clearAll() removes all notifications', () => {
    const queue = new NotificationsQueue();

    queue.notify(infoNotifyProps());
    queue.notify(infoNotifyProps());

    assert.equal(queue.queueLength, 2);

    queue.clearAll();
    assert.equal(queue.queueLength, 0);
});

test('notify() with closeOthers=true clears existing notifications', () => {
    const queue = new NotificationsQueue();

    queue.notify(infoNotifyProps());
    assert.equal(queue.queueLength, 1);

    queue.notify(infoNotifyProps({ message: 'Second' }), true);
    assert.equal(queue.queueLength, 1);

    const entries = queue.mapQueue((n) => n.props.message);
    assert.equal(entries[0], 'Second');
});

test('mapQueue() iterates over all notifications', () => {
    const queue = new NotificationsQueue();

    queue.notify(infoNotifyProps({ message: 'A' }));
    queue.notify(infoNotifyProps({ message: 'B' }));

    const messages = queue.mapQueue((n) => n.props.message).sort();
    assert.deepEqual(messages, ['A', 'B']);
});

test('mapQueue() returns empty array for empty queue', () => {
    const queue = new NotificationsQueue();

    const result = queue.mapQueue((n) => n.props.message);
    assert.deepEqual(result, []);
});

test('notify() with timeout:false disables auto-close', (t) => {
    // Use fake timers so the test does not depend on real wall-clock time.
    // The auto-close timer (if any) only fires when we explicitly advance it.
    t.mock.timers.enable();

    const queue = new NotificationsQueue();

    const uuid = queue.notify(infoNotifyProps({ timeout: false }));
    assert.equal(queue.queueLength, 1);

    // Advance fake time just past the default notify lifetime. Because
    // timeout:false means no timer was scheduled, the notification must remain.
    t.mock.timers.tick(DEFAULT_NOTIFY_LIFETIME + 1);
    assert.equal(queue.queueLength, 1);

    // Clean up
    queue.closeNotify(uuid);
});

test('notify() with numeric timeout auto-closes after specified time', (t) => {
    // Use fake timers so the auto-close fires deterministically on tick()
    // instead of relying on real wall-clock scheduling.
    t.mock.timers.enable();

    const queue = new NotificationsQueue();

    queue.notify(infoNotifyProps({ timeout: 10 }));
    assert.equal(queue.queueLength, 1);

    // Just before the deadline the notification is still present.
    t.mock.timers.tick(9);
    assert.equal(queue.queueLength, 1);

    // Advancing to/past the deadline fires the auto-close timer
    // synchronously on tick(), removing the notification.
    t.mock.timers.tick(1);
    assert.equal(queue.queueLength, 0);
});
