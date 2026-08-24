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
            if (!editorStore.isDirty) {
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
