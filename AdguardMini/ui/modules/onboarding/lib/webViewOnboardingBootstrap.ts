// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import {
    installCallbackDispatch,
    registerCallbackHandler,
} from 'Common/apis/callbackDispatch';
import { installSystemClipboardBridge } from 'Common/lib/systemClipboard';
import { webViewBootstrap } from 'Common/webViewBootstrap';

import type { OnboardingCallbackService } from 'Common/apis/callbacks/OnboardingCallbackService';

/** Wires onboarding module to WKWebView host and callback dispatcher. */
export function setupOnboardingWebViewBridge(
    onboardingCallbackService: OnboardingCallbackService,
): void {
    webViewBootstrap();

    // Route clipboard writes through Swift bridge.
    installSystemClipboardBridge();

    installCallbackDispatch();

    const methods = [
        'OnEffectiveThemeChanged',
    ] as const;

    for (const method of methods) {
        registerCallbackHandler(`OnboardingCallbackService.${method}`, async (bytes: Uint8Array) => {
            await onboardingCallbackService[method](bytes.buffer);
        });
    }
}
