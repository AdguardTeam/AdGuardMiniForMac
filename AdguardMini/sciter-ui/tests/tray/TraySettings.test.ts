// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TraySettings.test.ts
//  AdguardMini
//

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

// Mock Sciter/webpack globals for Node.js test environment.
(globalThis as Record<string, unknown>).window ??= {
    API: {
        // Use setTimeout to defer resolution beyond microtask queue,
        // so the synchronous test assertions see pre-initialization state.
        Execute: () => new Promise((resolve) => setTimeout(() => resolve(new Proxy({}, {
            get: (_, prop) => (prop === 'language' ? 'en' : undefined),
        })), 0)),
    },
};
(globalThis as Record<string, unknown>).preactHooks ??= require('preact/hooks');
(globalThis as Record<string, unknown>).log ??= {
    dbg: () => {},
    info: () => {},
    error: () => {},
    setLogLevel: () => {},
};

import { TraySettings } from '../../modules/tray/store/modules/TraySettings';
import { LicenseStore } from '../../modules/common/stores/LicenseStore';

describe('TraySettings', () => {
    let licenseStore: LicenseStore;
    let traySettings: TraySettings;

    beforeEach(() => {
        licenseStore = new LicenseStore();
        traySettings = new TraySettings(licenseStore);
    });

    it('initializes loginItemEnabled as true', () => {
        assert.equal(traySettings.loginItemEnabled, true);
    });

    it('initializes newVersionAvailable as false', () => {
        assert.equal(traySettings.newVersionAvailable, false);
    });

    it('initializes settings as null until fetched', () => {
        assert.equal(traySettings.settings, null);
    });

    it('isMASReleaseVariant returns false when settings is null', () => {
        assert.equal(traySettings.isMASReleaseVariant, false);
    });

    it('setLoginItem updates login item state', () => {
        traySettings.setLoginItem(false);
        assert.equal(traySettings.loginItemEnabled, false);
    });

    it('setNewVersionAvailable updates version flag', () => {
        traySettings.setNewVersionAvailable(true);
        assert.equal(traySettings.newVersionAvailable, true);
    });

    it('setCompletedStory adds story ID', () => {
        traySettings.setCompletedStory('welcome' as never);
        assert.equal(traySettings.storyCompleted.has('welcome' as never), true);
    });

    it('checkApplicationVersion sets newVersionAvailable to undefined (pending)', () => {
        traySettings.setNewVersionAvailable(true);
        traySettings.checkApplicationVersion();
        assert.equal(traySettings.newVersionAvailable, undefined);
    });
});
