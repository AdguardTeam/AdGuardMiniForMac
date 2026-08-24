// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import {
    installCallbackDispatch,
    registerCallbackHandler,
} from 'Common/apis/callbackDispatch';
import { installSystemClipboardBridge } from 'Common/lib/systemClipboard';
import { webViewBootstrap } from 'Common/webViewBootstrap';

import type { AccountCallbackService } from 'Common/apis/callbacks/AccountCallbackService';
import type { FiltersCallbackService } from 'Common/apis/callbacks/FiltersCallbackService';
import type { SettingsCallbackService } from 'Common/apis/callbacks/SettingsCallbackService';
import type { UserRulesCallbackService } from 'Common/apis/callbacks/UserRulesCallbackService';

/** Wires settings module to WKWebView host and callback dispatcher. */
export function setupSettingsWebViewBridge(
    settingsCallbackService: SettingsCallbackService,
    userRulesCallbackService: UserRulesCallbackService,
    accountCallbackService: AccountCallbackService,
    filtersCallbackService: FiltersCallbackService,
): void {
    webViewBootstrap();

    // Route clipboard writes through Swift bridge.
    installSystemClipboardBridge();

    installCallbackDispatch();

    const methods = [
        'OnSafariExtensionUpdate',
        'OnLoginItemStateChange',
        'OnImportStateChange',
        'OnHardwareAccelerationChange',
        'OnApplicationVersionStatusResolved',
        'OnWindowDidBecomeMain',
        'OnSettingsPageRequested',
        'OnEffectiveThemeChanged',
        'OnSettingsWindowOpened',
        'OnURLFilterStateChanged',
    ] as const;

    for (const method of methods) {
        registerCallbackHandler(`SettingsCallbackService.${method}`, async (bytes: Uint8Array) => {
            await settingsCallbackService[method](bytes.buffer);
        });
    }

    registerCallbackHandler(
        'AccountCallbackService.OnLicenseUpdate',
        async (bytes: Uint8Array) => {
            await accountCallbackService.OnLicenseUpdate(bytes.buffer);
        },
    );

    const filterMethods = [
        'OnFiltersUpdate',
        'OnFiltersIndexUpdate',
        'OnCustomFiltersSubscribe',
    ] as const;

    for (const method of filterMethods) {
        registerCallbackHandler(`FiltersCallbackService.${method}`, async (bytes: Uint8Array) => {
            await filtersCallbackService[method](bytes.buffer);
        });
    }

    registerCallbackHandler(
        'UserRulesCallbackService.onUserFilterChange',
        async (bytes: Uint8Array) => {
            await userRulesCallbackService.onUserFilterChange(bytes.buffer);
        },
    );

    registerCallbackHandler(
        'UserRulesCallbackService.onUserRulesWindowClosed',
        async (bytes: Uint8Array) => {
            await userRulesCallbackService.onUserRulesWindowClosed(bytes.buffer);
        },
    );
}
