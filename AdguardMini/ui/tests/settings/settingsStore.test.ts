// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

// Installs the ambient `translate` global and the `Intl` mock (`updateLanguage`).
import 'Intl';
import { Settings } from '../../modules/settings/store/modules/Settings';
import { Settings as SettingsEnt } from '../../modules/common/apis/types';

// The store's `setSettings` calls the ambient `log` global; install a stub.
(globalThis as Record<string, unknown>).log = {
    setLogLevel: () => {},
};

/**
 * Behavioral tests for the settings `Settings` store — specifically that
 * `setSettings` syncs `loginItemEnabled` from the platform response.
 *
 * The health check card and the login item modal both read the store-level
 * `loginItemEnabled` field. That field was only updated through the
 * `OnLoginItemStateChange` callback, which the platform posts rarely, so a
 * login item disabled in System Settings never surfaced in the settings UI.
 */
test('setSettings marks login item disabled when the response reports it', () => {
    const settings = new Settings();
    settings.setSettings(new SettingsEnt({ loginItemEnabled: false, language: 'en' }));

    assert.equal(settings.loginItemEnabled, false);
});

test('setSettings keeps login item enabled when the response reports it enabled', () => {
    const settings = new Settings();
    settings.setSettings(new SettingsEnt({ loginItemEnabled: true, language: 'en' }));

    assert.equal(settings.loginItemEnabled, true);
});

test('setSettings overrides a previously disabled login item state', () => {
    const settings = new Settings();
    settings.setLoginItem(false);
    settings.setSettings(new SettingsEnt({ loginItemEnabled: true, language: 'en' }));

    assert.equal(settings.loginItemEnabled, true);
});
