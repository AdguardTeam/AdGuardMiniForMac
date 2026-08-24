// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * TS-side tests for the regenerated callback services. Verifies the
 * Swift→TS dispatch (`window.__dispatchCallback`) routes to the
 * regenerated callback service's methods after `installCallbackDispatch`
 * is wired. The regenerated TS callback templates are config-driven
 * (Task 2's `xcall_method_name` rename) — this test guards the
 * regenerated consumer-side routing.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
    installCallbackDispatch,
    registerCallbackHandler,
    __resetForTests,
} from '../../modules/common/apis/callbackDispatch';

import { TrayCallbackService } from '../../modules/common/apis/callbacks/TrayCallbackService';

void describe('regenerated TS callback services', () => {
    before(() => {
        // `installCallbackDispatch` installs on `window`, so a fake window
        // must exist first (mirrors `setupFakeWindow` in the other tests).
        (globalThis as Record<string, unknown>).window = {
            addEventListener: () => {},
            dispatchEvent: () => true,
        };
        // The generated callback services call `log.dbg(...)` before
        // reaching the internal handler (the app installs `window.log` in
        // webViewBootstrap). Stub it so routing can be verified.
        (globalThis as Record<string, unknown>).log = {
            dbg: () => {},
            error: () => {},
            info: () => {},
        };
        // Install the window.__dispatchCallback entry point.
        installCallbackDispatch();
    });

    after(() => {
        __resetForTests();
    });

    it('TrayCallbackService.OnEffectiveThemeChanged routes via window.__dispatchCallback', async () => {
        let invoked = false;
        // Provide stubs for all 8 methods required by ITrayCallbackServiceInternal.
        // Use as-cast since the Internal class is empty and the test only checks routing.
        const internal = {
            OnEffectiveThemeChanged: async () => { invoked = true; },
            OnTrayWindowVisibilityChange: async () => { /* noop */ },
            OnLoginItemStateChange: async () => { /* noop */ },
            OnApplicationVersionStatusResolved: async () => { /* noop */ },
            OnFilterStatusResolved: async () => { /* noop */ },
            OnSafariExtensionUpdate: async () => { /* noop */ },
            OnLicenseUpdate: async () => { /* noop */ },
            OnTrayPageRequested: async () => { /* noop */ },
        } as unknown as import('../../modules/common/apis/callbacks/TrayCallbackService').ITrayCallbackServiceInternal;
        const service = new TrayCallbackService(internal);
        // Register the routing — when __dispatchCallback is called with
        // the FQN, it should reach `service.OnEffectiveThemeChanged`.
        registerCallbackHandler(
            'TrayCallbackService.OnEffectiveThemeChanged',
            async (bytes) => { await service.OnEffectiveThemeChanged(bytes); },
        );

        // Simulate Swift pushing a callback with empty bytes
        // (base64 of empty data is the empty string).
        const bytes = '';
        const dispatch = ((globalThis as Record<string, unknown>).window as unknown as {
            __dispatchCallback?: (method: string, bytes: string) => Promise<void>;
        }).__dispatchCallback!;
        await dispatch('TrayCallbackService.OnEffectiveThemeChanged', bytes);

        assert.ok(
            invoked,
            'TrayCallbackService.OnEffectiveThemeChanged handler must be invoked by window.__dispatchCallback',
        );
    });
});
