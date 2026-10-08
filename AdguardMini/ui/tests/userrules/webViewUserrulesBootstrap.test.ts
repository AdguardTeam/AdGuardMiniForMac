// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { EffectiveTheme, EffectiveThemeValue, UserRule, UserRulesCallbackState } from '../../modules/common/apis/types';
import { __resetForTests } from '../../modules/common/apis/callbackDispatch';
import { editorStore } from '../../modules/userrules/editorStore';
import { setupUserrulesWebViewBridge } from '../../modules/userrules/lib/webViewUserrulesBootstrap';

const setupFakeWindow = () => {
    const w: Record<string, unknown> = {
        addEventListener: () => {},
        dispatchEvent: () => true,
    };
    (globalThis as Record<string, unknown>).window = w;
    (globalThis as Record<string, unknown>).document = {
        addEventListener: () => {},
        documentElement: { setAttribute: () => {} },
    } as unknown as Document;
    const posted: Array<{ name: string; body: unknown }> = [];
    w.webkit = {
        messageHandlers: {
            openLinkInBrowser: {
                postMessage: (url: string) => { posted.push({ name: 'openLinkInBrowser', body: url }); },
            },
            systemClipboard: {
                postMessage: (text: string) => { posted.push({ name: 'systemClipboard', body: text }); },
            },
        },
    };
    return { w, posted };
};

const getDispatch = (w: Record<string, unknown>) => (w as unknown as {
    __dispatchCallback: (method: string, bytes: string) => Promise<void>;
}).__dispatchCallback;

describe('webViewUserrulesBootstrap', () => {
    beforeEach(() => {
        __resetForTests();
        // Reset the shared editor store so tests start from a clean slate.
        editorStore.loadRules([], true);
        editorStore.setIsDirty(false);
        editorStore.setLoading(false);
    });

    afterEach(() => {
        delete (globalThis as Record<string, unknown>).window;
        delete (globalThis as Record<string, unknown>).document;
    });

    it('installs window.log / OpenLinkInBrowser / SystemClipboard', () => {
        const { w } = setupFakeWindow();
        setupUserrulesWebViewBridge();
        assert.ok(typeof w.log === 'object');
        assert.ok(typeof w.OpenLinkInBrowser === 'function');
        assert.ok(typeof w.SystemClipboard === 'object');
    });

    it('routes SystemClipboard.writeText to the Swift NSPasteboard bridge', () => {
        const { w, posted } = setupFakeWindow();
        setupUserrulesWebViewBridge();
        (w as unknown as { SystemClipboard: { writeText: (t: string) => void } }).SystemClipboard.writeText('LICENSE-KEY-1234');
        assert.deepEqual(posted, [{ name: 'systemClipboard', body: 'LICENSE-KEY-1234' }]);
    });

    it('installs window.__dispatchCallback', () => {
        const { w } = setupFakeWindow();
        setupUserrulesWebViewBridge();
        assert.ok(typeof (w as unknown as { __dispatchCallback: unknown }).__dispatchCallback === 'function');
    });

    it('routes OpenLinkInBrowser via window.webkit.messageHandlers.openLinkInBrowser', () => {
        const { w, posted } = setupFakeWindow();
        setupUserrulesWebViewBridge();
        (w as unknown as { OpenLinkInBrowser: (url: string) => void }).OpenLinkInBrowser('https://adguard.com');
        assert.deepEqual(posted, [{ name: 'openLinkInBrowser', body: 'https://adguard.com' }]);
    });

    it('onUserFilterChange reloads the editor when clean', async () => {
        const { w } = setupFakeWindow();
        setupUserrulesWebViewBridge();
        const state = new UserRulesCallbackState({
            rules: [new UserRule({ rule: '||example.com^', enabled: true })],
        });
        await getDispatch(w)(
            'UserRulesCallbackService.onUserFilterChange',
            Buffer.from(state.serializeBinary()).toString('base64'),
        );
        assert.equal(editorStore.rules.length, 1);
        assert.equal(editorStore.rules[0].rule, '||example.com^');
    });

    it('onUserFilterChange does not clobber unsaved edits when dirty', async () => {
        const { w } = setupFakeWindow();
        setupUserrulesWebViewBridge();
        editorStore.setRules([new UserRule({ rule: '||user-typing.com^', enabled: true })]);
        editorStore.setIsDirty(true);
        const state = new UserRulesCallbackState({
            rules: [new UserRule({ rule: '||external.com^', enabled: true })],
        });
        await getDispatch(w)(
            'UserRulesCallbackService.onUserFilterChange',
            Buffer.from(state.serializeBinary()).toString('base64'),
        );
        assert.equal(editorStore.rules.length, 1);
        assert.equal(editorStore.rules[0].rule, '||user-typing.com^');
    });

    it('onUserFilterChange skips reload when the push matches the working set', async () => {
        const { w } = setupFakeWindow();
        setupUserrulesWebViewBridge();
        const rules = [new UserRule({ rule: '||example.com^', enabled: true })];
        editorStore.setRules(rules);
        editorStore.setIsDirty(false);
        const workingRef = editorStore.rules;
        const state = new UserRulesCallbackState({ rules });
        await getDispatch(w)(
            'UserRulesCallbackService.onUserFilterChange',
            Buffer.from(state.serializeBinary()).toString('base64'),
        );
        // `loadRules` copies the working set; an unchanged push (the save
        // echo) must skip it so the editor is never re-seeded for large sets.
        assert.equal(editorStore.rules, workingRef);
        assert.equal(editorStore.rules.length, 1);
    });

    it('onUserFilterChange reloads when the push differs from the working set', async () => {
        const { w } = setupFakeWindow();
        setupUserrulesWebViewBridge();
        editorStore.setRules([new UserRule({ rule: '||example.com^', enabled: true })]);
        editorStore.setIsDirty(false);
        const state = new UserRulesCallbackState({
            rules: [new UserRule({ rule: '||external.com^', enabled: true })],
        });
        await getDispatch(w)(
            'UserRulesCallbackService.onUserFilterChange',
            Buffer.from(state.serializeBinary()).toString('base64'),
        );
        assert.equal(editorStore.rules.length, 1);
        assert.equal(editorStore.rules[0].rule, '||external.com^');
    });

    it('OnEffectiveThemeChanged applies the theme attribute', async () => {
        const { w } = setupFakeWindow();
        const doc = (globalThis as Record<string, unknown>).document as unknown as {
            documentElement: { setAttribute: (name: string, value: string) => void };
        };
        let applied: Array<[string, string]> = [];
        doc.documentElement.setAttribute = (name: string, value: string) => { applied.push([name, value]); };
        setupUserrulesWebViewBridge();
        const value = new EffectiveThemeValue({ value: EffectiveTheme.dark });
        await getDispatch(w)(
            'SettingsCallbackService.OnEffectiveThemeChanged',
            Buffer.from(value.serializeBinary()).toString('base64'),
        );
        assert.deepEqual(applied, [['theme', 'dark']]);
    });
});
