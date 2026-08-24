// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { EffectiveTheme } from 'Apis/types';

import { applyResolvedTheme } from '../../modules/userrules/lib/hooks/useTheme';

/**
 * Installs a minimal `document` stub so `applyThemeAttribute` can record
 * the `theme` attribute writes; returns the recorded attribute map.
 */
const installDocumentStub = (): Map<string, string> => {
    const attributes = new Map<string, string>();
    (globalThis as Record<string, unknown>).document = {
        documentElement: {
            setAttribute: (name: string, value: string) => attributes.set(name, value),
        },
    };
    return attributes;
};

afterEach(() => {
    delete (globalThis as Record<string, unknown>).document;
});

test('applyResolvedTheme sets the dark theme attribute for EffectiveTheme.dark', () => {
    const attributes = installDocumentStub();
    applyResolvedTheme(EffectiveTheme.dark);
    assert.equal(attributes.get('theme'), 'dark');
});

test('applyResolvedTheme sets the light theme attribute for EffectiveTheme.light', () => {
    const attributes = installDocumentStub();
    applyResolvedTheme(EffectiveTheme.light);
    assert.equal(attributes.get('theme'), 'light');
});
