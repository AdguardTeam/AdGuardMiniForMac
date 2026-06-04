// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ImportExport.test.ts
//  AdguardMini
//

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

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

import { ImportExport } from '../../modules/settings/store/modules/ImportExport';
import { AppSettings } from '../../modules/settings/store/modules/AppSettings';
import { Windowing } from '../../modules/settings/store/modules/Windowing';

describe('ImportExport', () => {
    let appSettings: AppSettings;
    let importExport: ImportExport;

    beforeEach(() => {
        appSettings = new AppSettings(new Windowing());
        importExport = new ImportExport(appSettings);
    });

    it('initializes with empty shouldGiveConsent on appSettings', () => {
        assert.equal(appSettings.shouldGiveConsent.length, 0);
    });

    it('initializes with undefined confirmMode', () => {
        assert.equal(importExport.confirmMode, undefined);
    });

    it('setShouldGiveConsent on appSettings updates consent IDs', () => {
        appSettings.setShouldGiveConsent([1, 2, 3]);
        assert.deepEqual(appSettings.shouldGiveConsent, [1, 2, 3]);
    });

    it('onImportSuccess resets consent state', () => {
        appSettings.setShouldGiveConsent([1, 2, 3]);
        importExport.onImportSuccess();
        assert.equal(appSettings.shouldGiveConsent.length, 0);
        assert.equal(importExport.confirmMode, undefined);
    });
});
