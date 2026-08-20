// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    URLFilterConfiguration,
    URLFilterInfo,
    URLFilterProtectionLevel,
    URLFilterState,
    URLFilterStatus,
} from '../../modules/common/apis/types';
import {
    notifySingleActive,
    rollbackTrayURLFilterEnabled,
    rollbackURLFilterCardSeen,
    rollbackURLFilterConfiguration,
    rollbackURLFilterPageSeen,
    withURLFilterConfiguration,
} from '../../modules/common/utils/urlFilterState';

function createState(data: ConstructorParameters<typeof URLFilterState>[0]) {
    return new URLFilterState(data);
}

function createConfiguration(data: ConstructorParameters<typeof URLFilterConfiguration>[0]) {
    return new URLFilterConfiguration(data);
}

test('withURLFilterConfiguration updates only configuration fields', () => {
    const state = createState({
        status: URLFilterStatus.running,
        configuration: createConfiguration({
            enabled: false,
            protectionLevel: URLFilterProtectionLevel.family,
        }),
        info: new URLFilterInfo({ rulesCount: 10 }),
        errorMessage: 'platform error',
        isNew: true,
        isPageNew: false,
    });

    const nextConfiguration = createConfiguration({
        enabled: true,
        protectionLevel: URLFilterProtectionLevel.safe,
    });

    const updatedState = withURLFilterConfiguration(state, nextConfiguration);

    assert.equal(updatedState.configuration.enabled, true);
    assert.equal(updatedState.configuration.protectionLevel, URLFilterProtectionLevel.safe);
    assert.equal(updatedState.status, URLFilterStatus.running);
    assert.equal(updatedState.info?.rulesCount, 10);
    assert.equal(updatedState.errorMessage, 'platform error');
    assert.equal(updatedState.isNew, true);
    assert.equal(updatedState.isPageNew, false);
});

test('rollbackURLFilterConfiguration restores previous configuration and preserves live state', () => {
    const previousConfiguration = createConfiguration({
        enabled: false,
        protectionLevel: URLFilterProtectionLevel.family,
    });
    const currentState = createState({
        status: URLFilterStatus.starting,
        configuration: createConfiguration({
            enabled: true,
            protectionLevel: URLFilterProtectionLevel.safe,
        }),
        info: new URLFilterInfo({ rulesCount: 123 }),
        errorMessage: 'platform error message',
        isNew: true,
        isPageNew: true,
    });

    const rolledBackState = rollbackURLFilterConfiguration(currentState, previousConfiguration);

    assert.equal(rolledBackState.configuration.enabled, false);
    assert.equal(rolledBackState.configuration.protectionLevel, URLFilterProtectionLevel.family);
    assert.equal(rolledBackState.status, URLFilterStatus.starting);
    assert.equal(rolledBackState.info?.rulesCount, 123);
    assert.equal(rolledBackState.errorMessage, 'platform error message');
    assert.equal(rolledBackState.isNew, true);
    assert.equal(rolledBackState.isPageNew, true);
});

test('rollbackURLFilterCardSeen restores only isNew from the previous snapshot', () => {
    const currentState = createState({
        status: URLFilterStatus.starting,
        configuration: createConfiguration({ enabled: true }),
        info: new URLFilterInfo({ rulesCount: 2 }),
        errorMessage: 'second',
        isNew: false,
        isPageNew: true,
    });

    const rolledBackState = rollbackURLFilterCardSeen(currentState, true);

    assert.equal(rolledBackState.isNew, true);
    assert.equal(rolledBackState.isPageNew, true);
    assert.equal(rolledBackState.status, URLFilterStatus.starting);
    assert.equal(rolledBackState.errorMessage, 'second');
});

test('rollbackURLFilterPageSeen restores only isPageNew from the previous snapshot', () => {
    const currentState = createState({
        status: URLFilterStatus.starting,
        configuration: createConfiguration({ enabled: true }),
        info: new URLFilterInfo({ rulesCount: 20 }),
        errorMessage: 'second',
        isNew: true,
        isPageNew: false,
    });

    const rolledBackState = rollbackURLFilterPageSeen(currentState, true);

    assert.equal(rolledBackState.isNew, true);
    assert.equal(rolledBackState.isPageNew, true);
    assert.equal(rolledBackState.status, URLFilterStatus.starting);
    assert.equal(rolledBackState.errorMessage, 'second');
});

test('rollbackTrayURLFilterEnabled restores only enabled and preserves current protection level', () => {
    const currentConfiguration = createConfiguration({
        enabled: true,
        protectionLevel: URLFilterProtectionLevel.family,
    });

    const rolledBackConfiguration = rollbackTrayURLFilterEnabled(currentConfiguration, false);

    assert.equal(rolledBackConfiguration.enabled, false);
    assert.equal(rolledBackConfiguration.protectionLevel, URLFilterProtectionLevel.family);
});

test('notifySingleActive deduplicates repeated URL-filter failures while the toast is active', () => {
    let notifyCount = 0;
    const activeNotifications = new Set<string>();
    const queue = {
        get(id: string) {
            return activeNotifications.has(id) ? { props: {} } : undefined;
        },
        notify() {
            notifyCount += 1;
            activeNotifications.add('notification-id');
            return 'notification-id';
        },
    };
    const notification = { message: 'failure' };

    const firstNotificationId = notifySingleActive(null, queue, notification);
    const secondNotificationId = notifySingleActive(firstNotificationId, queue, notification);

    assert.equal(firstNotificationId, 'notification-id');
    assert.equal(secondNotificationId, 'notification-id');
    assert.equal(notifyCount, 1);
});

test('notifySingleActive re-shows the toast after the previous notification disappears', () => {
    let notifyCount = 0;
    const activeNotifications = new Set<string>();
    const queue = {
        get(id: string) {
            return activeNotifications.has(id) ? { props: {} } : undefined;
        },
        notify() {
            notifyCount += 1;
            const id = `notification-id-${notifyCount}`;
            activeNotifications.add(id);
            return id;
        },
    };
    const notification = { message: 'failure' };

    const firstNotificationId = notifySingleActive(null, queue, notification);
    activeNotifications.delete(firstNotificationId);
    const secondNotificationId = notifySingleActive(firstNotificationId, queue, notification);

    assert.equal(firstNotificationId, 'notification-id-1');
    assert.equal(secondNotificationId, 'notification-id-2');
    assert.equal(notifyCount, 2);
});
