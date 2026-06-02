// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SafariExtensionsStore } from '../../modules/common/stores/SafariExtensionsStore';
import { SafariExtensions, SafariExtension, SafariExtensionStatus } from '../../modules/common/apis/types/Common';

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

    const effective = store.effectiveExtensionsList;
    const general = effective.find((ext) => ext.id === 'general');
    // Should still show "disabled" not "loading"
    assert.equal(general?.status, SafariExtensionStatus.disabled);
});

test('effectiveExtensionsList updates when loading resolves to new state', () => {
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
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.ok,
    }));

    const effective = store.effectiveExtensionsList;
    const general = effective.find((ext) => ext.id === 'general');
    assert.equal(general?.status, SafariExtensionStatus.ok);
});

test('effectiveExtensionsList keeps loading when no previous state exists (initial load)', () => {
    const store = new SafariExtensionsStore();

    // First state received is already loading — no previous state cached
    store.setSafariExtensions(createExtensions({
        general: SafariExtensionStatus.loading,
    }));

    const effective = store.effectiveExtensionsList;
    const general = effective.find((ext) => ext.id === 'general');
    assert.equal(general?.status, SafariExtensionStatus.loading);
});

test('effectiveExtensionsList tracks each extension independently', () => {
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

    const effective = store.effectiveExtensionsList;
    const general = effective.find((ext) => ext.id === 'general');
    const privacy = effective.find((ext) => ext.id === 'privacy');
    assert.equal(general?.status, SafariExtensionStatus.disabled);
    assert.equal(privacy?.status, SafariExtensionStatus.limit_exceeded);
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

    // Should still report all enabled using cached state
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
    const effective = store.effectiveExtensionsList;
    const general = effective.find((ext) => ext.id === 'general');
    assert.equal(general?.status, SafariExtensionStatus.ok);
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

    // Should still show limit_exceeded
    const effective = store.effectiveExtensionsList;
    const privacy = effective.find((ext) => ext.id === 'privacy');
    assert.equal(privacy?.status, SafariExtensionStatus.limit_exceeded);
});

test('isConsideredEnabled updates normally when not loading', () => {
    const store = new SafariExtensionsStore();

    // All enabled
    store.setSafariExtensions(createExtensions({}, true));
    assert.equal(store.allExtensionsEffectivelyEnabled, true);

    // User disables general (not loading, real state change)
    store.setSafariExtensions(createExtensions({}, true, { general: false }));
    assert.equal(store.allExtensionsEffectivelyEnabled, false);
});
