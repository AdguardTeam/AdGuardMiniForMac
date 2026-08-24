// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import {
    installCallbackDispatch,
    registerCallbackHandler,
} from 'Common/apis/callbackDispatch';
import { installSystemClipboardBridge } from 'Common/lib/systemClipboard';
import { webViewBootstrap } from 'Common/webViewBootstrap';

import type { TrayCallbackService } from 'Common/apis/callbacks/TrayCallbackService';

/** Wires tray module to WKWebView host and callback dispatcher. */
export function setupTrayWebViewBridge(trayCallbackService: TrayCallbackService): void {
    webViewBootstrap();

    // Route clipboard writes through Swift bridge.
    installSystemClipboardBridge();

    installCallbackDispatch();

    const methods = [
        'OnTrayWindowVisibilityChange',
        'OnLoginItemStateChange',
        'OnApplicationVersionStatusResolved',
        'OnFilterStatusResolved',
        'OnSafariExtensionUpdate',
        'OnLicenseUpdate',
        'OnEffectiveThemeChanged',
        'OnTrayPageRequested',
    ] as const;

    for (const method of methods) {
        registerCallbackHandler(`TrayCallbackService.${method}`, async (bytes: Uint8Array) => {
            await trayCallbackService[method](bytes.buffer);
        });
    }
}
