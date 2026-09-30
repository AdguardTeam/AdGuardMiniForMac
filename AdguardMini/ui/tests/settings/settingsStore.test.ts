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
 * Behavioral tests for the settings `Settings` store — that `setSettings`
 * syncs platform-reported state (`loginItemEnabled`,
 * `reportProblemLabelShown`) and that the one-time flags are persisted.
 *
 * The health check card and the login item modal both read the store-level
 * `loginItemEnabled` field. That field was only updated through the
 * `OnLoginItemStateChange` callback, which the platform posts rarely, so a
 * login item disabled in System Settings never surfaced in the settings UI.
 *
 * The report problem label is shown only once, so its shown flag lives in
 * UserDefaults on the platform and must survive a window or app restart.
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

test('setSettings syncs the report problem label shown flag', () => {
    const settings = new Settings();
    settings.setSettings(new SettingsEnt({ reportProblemLabelShown: true, language: 'en' }));

    assert.equal(settings.reportProblemLabelShown, true);
});

test('report problem label stays unanswered until the platform responds', () => {
    // `undefined` keeps the one-time tooltip disarmed: the title must not show
    // it before the persisted flag is known, or every window open would flash it.
    const settings = new Settings();

    assert.equal(settings.reportProblemLabelShown, undefined);
});

test('setSettings reports the label as never shown when the platform has no record', () => {
    const settings = new Settings();
    settings.setSettings(new SettingsEnt({ language: 'en' }));

    assert.equal(settings.reportProblemLabelShown, false);
});

test('updateReportProblemLabelShown marks the flag locally and persists it', async () => {
    const calls: unknown[] = [];
    (globalThis as unknown as { window: Record<string, unknown> }).window =
        globalThis as unknown as Record<string, unknown>;
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: async (req: unknown) => {
            calls.push(req);
            return undefined;
        },
    };

    try {
        const settings = new Settings();
        settings.updateReportProblemLabelShown(true);

        assert.equal(settings.reportProblemLabelShown, true);
        assert.equal(calls.length, 1);
        const req = calls[0] as {
            FQN: string;
            getRequestMessage(): { toObject(): Record<string, unknown> };
        };
        assert.equal(req.FQN, 'SettingsService.UpdateReportProblemLabelShown');
        assert.equal(req.getRequestMessage().toObject().value, true);
    } finally {
        delete (globalThis as unknown as { API?: unknown }).API;
        delete (globalThis as unknown as { window?: unknown }).window;
    }
});
