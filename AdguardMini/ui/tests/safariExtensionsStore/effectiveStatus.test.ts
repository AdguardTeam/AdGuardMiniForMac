// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    SAFARI_EXTENSIONS_SETTLE_MS,
    SafariExtensionsStore,
} from '../../modules/common/stores/SafariExtensionsStore';
import { SafariExtensions, SafariExtension, SafariExtensionStatus } from '../../modules/common/apis/types/SafariExtension';

/**
 * Creates a SafariExtensions object with the given statuses for each extension.
 * Accepts per-extension isConsideredEnabled overrides via the enabled map.
 */
function createExtensions(statuses: {
    general?: SafariExtensionStatus;
    privacy?: SafariExtensionStatus;
    social?: SafariExtensionStatus;
    security?: SafariExtensionStatus;
    other?: SafariExtensionStatus;
    custom?: SafariExtensionStatus;
    adguardForSafari?: SafariExtensionStatus;
}, allEnabled = true, enabled?: Partial<Record<string, boolean>>): SafariExtensions {
    const extensions = new SafariExtensions();
    const defaultStatus = SafariExtensionStatus.ok;

    extensions.general = new SafariExtension({
        id: 'general',
        status: statuses.general ?? defaultStatus,
        isConsideredEnabled: enabled?.general ?? allEnabled,
    });
    extensions.privacy = new SafariExtension({
        id: 'privacy',
        status: statuses.privacy ?? defaultStatus,
        isConsideredEnabled: enabled?.privacy ?? allEnabled,
    });
    extensions.social = new SafariExtension({
        id: 'social',
        status: statuses.social ?? defaultStatus,
        isConsideredEnabled: enabled?.social ?? allEnabled,
    });
    extensions.security = new SafariExtension({
        id: 'security',
        status: statuses.security ?? defaultStatus,
        isConsideredEnabled: enabled?.security ?? allEnabled,
    });
    extensions.other = new SafariExtension({
        id: 'other',
        status: statuses.other ?? defaultStatus,
        isConsideredEnabled: enabled?.other ?? allEnabled,
    });
    extensions.custom = new SafariExtension({
        id: 'custom',
        status: statuses.custom ?? defaultStatus,
        isConsideredEnabled: enabled?.custom ?? allEnabled,
    });
    extensions.adguardForSafari = new SafariExtension({
        id: 'adguardForSafari',
        status: statuses.adguardForSafari ?? defaultStatus,
        isConsideredEnabled: enabled?.adguardForSafari ?? allEnabled,
    });

    return extensions;
}

/**
 * Returns the extension with the given id from the effective list.
 */
function effectiveStatus(store: SafariExtensionsStore, id: string): SafariExtensionStatus | undefined {
    return store.effectiveExtensionsList.find((ext) => ext.id === id)?.status;
}

test('effectiveExtensionsList returns real statuses when no extension is loading', () => {
    const store = new SafariExtensionsStore();
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.disabled,
        privacy: SafariExtensionStatus.ok,
    }, false));

    const effective = store.effectiveExtensionsList;
    const general = effective.find((ext) => ext.id === 'general');
    assert.equal(general?.status, SafariExtensionStatus.disabled);
});

test('markLoaded marks the extension list as received', () => {
    const store = new SafariExtensionsStore();

    assert.equal(store.isLoaded, false);

    store.markLoaded();

    assert.equal(store.isLoaded, true);
});

test('effectiveExtensionsList preserves previous status when extension transitions to loading', () => {
    const store = new SafariExtensionsStore();

    // Initial state: general is disabled
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.disabled,
    }, false));

    // Transition to loading (filter conversion starts)
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.loading,
    }, false));

    // Should still show "disabled" not "loading"
    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.disabled);
});

test('effectiveExtensionsList adopts the status loading resolved to after the settle window', (t) => {
    t.mock.timers.enable();
    const store = new SafariExtensionsStore();

    // Initial state: general is disabled
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.disabled,
    }, false));

    // Transition to loading
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.loading,
    }, false));

    // Resolves to ok
    store.setSafariExtensions(createExtensions({}));

    // The loaded list must not move the health check before it settles.
    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.disabled);

    t.mock.timers.tick(SAFARI_EXTENSIONS_SETTLE_MS + 1);

    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.ok);
});

test('effectiveExtensionsList keeps loading when no previous state exists (initial load)', () => {
    const store = new SafariExtensionsStore();

    // First state received is already loading — no previous state to keep
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.loading,
    }));

    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.loading);
});

test('effectiveExtensionsList holds the whole settled list while any extension is loading', () => {
    const store = new SafariExtensionsStore();

    // Initial: general=disabled, privacy=limit_exceeded
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.disabled,
        privacy: SafariExtensionStatus.limit_exceeded,
    }, false));

    // Both go to loading
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.loading,
        privacy: SafariExtensionStatus.loading,
    }, false));

    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.disabled);
    assert.equal(effectiveStatus(store, 'privacy'), SafariExtensionStatus.limit_exceeded);
});

test('effectiveExtensionsList ignores reload statuses while a cycle is running', (t) => {
    t.mock.timers.enable();
    const store = new SafariExtensionsStore();

    // Settled state: general is broken.
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.safari_error,
    }));

    // Conversion starts for two extensions.
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.loading,
        privacy: SafariExtensionStatus.loading,
    }));

    // General finishes its reload while privacy is still in flight.
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.ok,
        privacy: SafariExtensionStatus.loading,
    }));

    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.safari_error);

    // The cycle is over, but its list has not settled yet.
    store.setSafariExtensions(createExtensions({}));
    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.safari_error);

    t.mock.timers.tick(SAFARI_EXTENSIONS_SETTLE_MS + 1);

    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.ok);
});

test('effectiveExtensionsList never shows a status that reverts within the settle window', (t) => {
    t.mock.timers.enable();
    const store = new SafariExtensionsStore();

    store.setSafariExtensions(createExtensions({}));
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.safari_error,
    }));
    store.setSafariExtensions(createExtensions({}));

    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.ok);

    t.mock.timers.tick(SAFARI_EXTENSIONS_SETTLE_MS + 1);

    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.ok);
});

test('a changed list restarts the settle window', (t) => {
    t.mock.timers.enable();
    const store = new SafariExtensionsStore();

    store.setSafariExtensions(createExtensions({}));
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.safari_error,
    }));

    t.mock.timers.tick(SAFARI_EXTENSIONS_SETTLE_MS - 1);
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.safari_error,
        privacy: SafariExtensionStatus.safari_error,
    }));

    // The window has restarted, so the earlier deadline must not fire.
    t.mock.timers.tick(SAFARI_EXTENSIONS_SETTLE_MS - 1);
    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.ok);
    assert.equal(effectiveStatus(store, 'privacy'), SafariExtensionStatus.ok);

    t.mock.timers.tick(2);

    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.safari_error);
    assert.equal(effectiveStatus(store, 'privacy'), SafariExtensionStatus.safari_error);
});

test('repeated identical pushes do not restart the settle window', (t) => {
    t.mock.timers.enable();
    const store = new SafariExtensionsStore();

    store.setSafariExtensions(createExtensions({}));
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.safari_error,
    }));

    t.mock.timers.tick(SAFARI_EXTENSIONS_SETTLE_MS - 1);
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.safari_error,
    }));
    t.mock.timers.tick(2);

    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.safari_error);
});

test('allExtensionsEffectivelyEnabled uses effective view', () => {
    const store = new SafariExtensionsStore();

    // All enabled and ok
    store.setSafariExtensions(createExtensions({}, true));
    assert.equal(store.allExtensionsEffectivelyEnabled, true);

    // Transition to loading — should retain "enabled" perception
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.loading,
    }, true));
    assert.equal(store.allExtensionsEffectivelyEnabled, true);
});

test('safariExtensionsLoading still reflects real loading state', () => {
    const store = new SafariExtensionsStore();

    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.disabled,
    }, false));
    assert.equal(store.safariExtensionsLoading, false);

    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.loading,
    }, false));
    assert.equal(store.safariExtensionsLoading, true);
});

test('hasExtensionsDisabled does not flicker when loading changes isConsideredEnabled', () => {
    const store = new SafariExtensionsStore();

    // All extensions enabled and ok
    store.setSafariExtensions(createExtensions({}, true));
    assert.equal(store.allExtensionsEffectivelyEnabled, true);

    // During loading, Swift temporarily sends isConsideredEnabled=false
    store.setSafariExtensions(createExtensions(
        { general: SafariExtensionStatus.loading },
        true,
        { general: false },
    ));

    // Should still report all enabled using the settled state
    assert.equal(store.allExtensionsEffectivelyEnabled, true);
});

test('hasExtensionsBroken does not flicker during loading', () => {
    const store = new SafariExtensionsStore();

    // All ok
    store.setSafariExtensions(createExtensions({}, true));

    // Transition to loading
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.loading,
    }, true));

    // Effective status should be "ok", not broken
    assert.equal(effectiveStatus(store, 'general'), SafariExtensionStatus.ok);
});

test('hasRulesLimitExceeded preserved during loading', () => {
    const store = new SafariExtensionsStore();

    // Privacy has limit exceeded
    store.setSafariExtensions(createExtensions({
        privacy: SafariExtensionStatus.limit_exceeded,
    }, true));

    // Transitions to loading
    store.setSafariExtensions(createExtensions({
        privacy: SafariExtensionStatus.loading,
    }, true));

    assert.equal(effectiveStatus(store, 'privacy'), SafariExtensionStatus.limit_exceeded);
});

test('isConsideredEnabled is adopted after the settle window when not loading', (t) => {
    t.mock.timers.enable();
    const store = new SafariExtensionsStore();

    // All enabled
    store.setSafariExtensions(createExtensions({}, true));
    assert.equal(store.allExtensionsEffectivelyEnabled, true);

    // User disables general (not loading, real state change)
    store.setSafariExtensions(createExtensions({}, true, { general: false }));
    assert.equal(store.allExtensionsEffectivelyEnabled, true);

    t.mock.timers.tick(SAFARI_EXTENSIONS_SETTLE_MS + 1);

    assert.equal(store.allExtensionsEffectivelyEnabled, false);
});
