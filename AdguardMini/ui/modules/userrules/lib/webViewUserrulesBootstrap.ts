// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { EffectiveThemeValue, UserRulesCallbackState } from 'Apis/types';
import { installCallbackDispatch, registerCallbackHandler } from 'Common/apis/callbackDispatch';
import { installSystemClipboardBridge } from 'Common/lib/systemClipboard';
import { webViewBootstrap } from 'Common/webViewBootstrap';

import { editorStore } from '../editorStore';

import { applyResolvedTheme } from './hooks/useTheme';

/** Wires userrules module to WKWebView host and callback dispatcher. */
export function setupUserrulesWebViewBridge(): void {
    webViewBootstrap();

    // Route clipboard writes through Swift bridge.
    installSystemClipboardBridge();

    installCallbackDispatch();

    registerCallbackHandler(
        'UserRulesCallbackService.onUserFilterChange',
        async (bytes: Uint8Array) => {
            const state = UserRulesCallbackState.deserializeBinary(bytes);
            // Mid-edit pushes (Assistant, popup site-protection toggle) wait for the apply hint.
            if (editorStore.isDirty) {
                editorStore.setPendingRules(editorStore.hasSameRules(state.rules) ? null : state.rules);
                return;
            }
            // After the editor's own Save, Swift echoes the saved set back as
            // a push. Re-seeding the editor with the identical working set it
            // just saved would rebuild the whole CodeMirror document
            // synchronously — blocking the WebContent main thread and making
            // the editor appear unresponsive exactly when a large rule set is
            // being saved. Skip the reload when the push matches what the
            // editor already shows.
            if (!editorStore.hasSameRules(state.rules)) {
                editorStore.loadRules(state.rules, editorStore.enabled);
            }
        },
    );

    registerCallbackHandler(
        'SettingsCallbackService.OnEffectiveThemeChanged',
        async (bytes: Uint8Array) => {
            const value = EffectiveThemeValue.deserializeBinary(bytes);
            applyResolvedTheme(value.value);
        },
    );
}
