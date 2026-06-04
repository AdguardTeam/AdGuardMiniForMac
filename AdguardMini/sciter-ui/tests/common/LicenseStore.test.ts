// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LicenseStore.test.ts
//  AdguardMini
//

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Mock Sciter/webpack globals for Node.js test environment.
(globalThis as Record<string, unknown>).window ??= {
    API: {
        Execute: async () => new Proxy({}, {
            get: (_, prop) => (prop === 'language' ? 'en' : undefined),
        }),
    },
};
(globalThis as Record<string, unknown>).preactHooks ??= require('preact/hooks');
(globalThis as Record<string, unknown>).log ??= {
    dbg: () => {},
    info: () => {},
    error: () => {},
    setLogLevel: () => {},
};

import { LicenseStore } from '../../modules/common/stores/LicenseStore';

describe('LicenseStore', () => {
    it('hasLicense is false when license has error', () => {
        const store = new LicenseStore();
        assert.equal(store.hasLicense, false);
    });

    it('isLicenseOrTrialActive is false when no license', () => {
        const store = new LicenseStore();
        assert.equal(store.isLicenseOrTrialActive, false);
    });

    it('trialAvailableDays defaults to 0', () => {
        const store = new LicenseStore();
        assert.equal(store.trialAvailableDays, 0);
    });

    it('isLicenseActive is false on fresh store', () => {
        const store = new LicenseStore();
        assert.equal(store.isLicenseActive, false);
    });

    it('isFreeware is false on fresh store', () => {
        const store = new LicenseStore();
        assert.equal(store.isFreeware, false);
    });
});
