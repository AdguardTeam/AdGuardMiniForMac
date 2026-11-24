// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { onTestFinished, test, beforeEach, afterEach } from 'vitest';

import { render } from 'preact';

import {
    NotificationContext,
    NotificationsQueueIconType,
    NotificationsQueueType,
} from 'Common/stores/NotificationsQueue';
import { useUserRulesFileActions } from 'Modules/settings/components/UserRules/hooks/useUserRulesFileActions';
import { __resetSettingsTestStore, store } from 'SettingsStore';

// The actions log a rejected request through the ambient `log` global.
(globalThis as Record<string, unknown>).log = {
    error: () => {},
};

type UserRulesFileActions = ReturnType<typeof useUserRulesFileActions>;

/** Hooks a test case registers for teardown. */

/** Notification the page queued during one case. */
interface QueuedNotification {
    message: unknown;
    type?: NotificationsQueueType;
    iconType?: NotificationsQueueIconType;
    notificationContext?: NotificationContext;
    btnLabel?: string;
    onClick?(): void;
}

/** Request the page sent to the platform. */
interface SentRequest {
    FQN: string;
    getRequestMessage(): { toObject(): Record<string, unknown> };
}

let notifications: QueuedNotification[] = [];
let rememberedDirectories: string[] = [];
let sentRequests: SentRequest[] = [];

/**
 * Installs a platform stub whose file panel resolves to the given path.
 *
 * @param selectedPath Path the file panel returns.
 */
function installPlatform(selectedPath: string): void {
    (window as unknown as { API: { Execute(req: SentRequest): Promise<{ path: string }> } }).API = {
        Execute: (request) => {
            sentRequests.push(request);
            return Promise.resolve({ path: selectedPath });
        },
    };
}

/**
 * Installs the store fields the actions read.
 *
 * @param importUserRules Result of the import call.
 * @param exportUserRules Result of the export call (`true` is an error reply).
 */
function installStore(
    importUserRules: () => Promise<boolean>,
    exportUserRules: () => Promise<boolean>,
): void {
    store.notification = {
        notify: (queued: QueuedNotification) => {
            notifications.push(queued);
        },
    };
    store.settings = {
        userActionLastDirectory: '/Users/test/Documents',
        updateUserActionLastDirectory: (path: string) => {
            rememberedDirectories.push(path);
        },
    };
    store.userRules = { importUserRules, exportUserRules };
}

/**
 * Renders the hook through a harness and registers its teardown.
 *
 * @returns The hook's return value.
 */
function mountActions(): { current: UserRulesFileActions } {
    const actions: { current?: UserRulesFileActions } = {};
    const container = document.createElement('div');
    document.body.appendChild(container);

    function Harness() {
        actions.current = useUserRulesFileActions();
        return null;
    }

    render(<Harness />, container);

    onTestFinished(() => {
        render(null, container);
        container.remove();
    });

    return actions as { current: UserRulesFileActions };
}

beforeEach(() => {
    __resetSettingsTestStore();
    notifications = [];
    rememberedDirectories = [];
    sentRequests = [];
});

afterEach(() => {
    delete (window as unknown as { API?: unknown }).API;
});

test('import reports success only when the platform applied the rules', async () => {
    installStore(async () => true, async () => false);
    installPlatform('/Users/test/Documents/rules.txt');
    const actions = mountActions();

    await actions.current.onImportRules();

    assert.equal(notifications.length, 1, 'a successful import queues one notification');
    assert.equal(notifications[0].type, NotificationsQueueType.success);
    assert.equal(notifications[0].message, 'notification.user.rules.import');
    assert.deepEqual(rememberedDirectories, ['/Users/test/Documents']);
});

test('import reports a failure when the platform replies without rules', async () => {
    installStore(async () => false, async () => false);
    installPlatform('/Users/test/Documents/rules.txt');
    const actions = mountActions();

    await actions.current.onImportRules();

    assert.equal(notifications.length, 1, 'a rejected import must not report success');
    assert.equal(notifications[0].type, NotificationsQueueType.warning);
    assert.equal(notifications[0].iconType, NotificationsQueueIconType.error);
    assert.equal(notifications[0].message, 'notification.user.rules.import.failed');
});

test('import reports a failure when the request rejects', async () => {
    installStore(async () => {
        throw new Error('rpc rejected');
    }, async () => false);
    installPlatform('/Users/test/Documents/rules.txt');
    const actions = mountActions();

    await actions.current.onImportRules();

    assert.equal(notifications.length, 1, 'a rejected request must not report success');
    assert.equal(notifications[0].type, NotificationsQueueType.warning);
    assert.equal(notifications[0].message, 'notification.user.rules.import.failed');
});

test('export reports success with a Finder action when the file was written', async () => {
    installStore(async () => false, async () => false);
    installPlatform('/Users/test/Documents/user_rules.txt');
    const actions = mountActions();

    await actions.current.onExportRules();

    assert.equal(notifications.length, 1, 'a successful export queues one notification');
    assert.equal(notifications[0].notificationContext, NotificationContext.ctaButton);
    assert.equal(notifications[0].message, 'notification.user.rules.export');
    assert.equal(notifications[0].btnLabel, 'notification.open.in.finder');

    notifications[0].onClick?.();

    assert.equal(sentRequests.length, 2, 'the Finder action sends a second request');
    assert.equal(sentRequests[1].FQN, 'InternalService.ShowInFinder');
    assert.equal(
        sentRequests[1].getRequestMessage().toObject().path,
        '/Users/test/Documents/user_rules.txt',
    );
});

test('export reports a failure when the platform rejected the write', async () => {
    installStore(async () => false, async () => true);
    installPlatform('/Users/test/Documents/user_rules.txt');
    const actions = mountActions();

    await actions.current.onExportRules();

    assert.equal(notifications.length, 1, 'a rejected export must not report success');
    assert.equal(notifications[0].type, NotificationsQueueType.warning);
    assert.equal(notifications[0].message, 'something went wrong');
});

test('export reports a failure when the request rejects', async () => {
    installStore(async () => false, async () => {
        throw new Error('rpc rejected');
    });
    installPlatform('/Users/test/Documents/user_rules.txt');
    const actions = mountActions();

    await actions.current.onExportRules();

    assert.equal(notifications.length, 1, 'a rejected request must not report success');
    assert.equal(notifications[0].type, NotificationsQueueType.warning);
    assert.equal(notifications[0].message, 'something went wrong');
});
