// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

// Dispatch-time errors are logged and dropped (see the fire-and-forget
// contract below); `no-console` is disabled because logging is the module's
// failure-reporting path.
/* eslint-disable no-console */

import { base64ToBytes } from './bridgeBytes';

/**
 * PoC WKWebView callback dispatch. Registers
 * `window.__dispatchCallback(method, bytes)` on the TS side; routes calls
 * to the existing TS callback service classes by method FQN.
 *
 * `bytes` arrives from the native side as a base64 string (WKWebView's
 * `callAsyncJavaScript` accepts no `Data` arguments) and is decoded to a
 * `Uint8Array` before the handler is invoked.
 *
 * Fire-and-forget: pushes do NOT reject the Swift-side `evaluateJavaScript`
 * call if a handler throws — errors are logged and dropped (per PRD §Module
 * Design — Callback Dispatch failure modes).
 */

type CallbackHandler = (bytes: Uint8Array) => Promise<void>;

const handlers = new Map<string, CallbackHandler>();

/**
 * Register a handler for the given method FQN.
 *
 * @param fqn - Fully-qualified callback method name (e.g.,
 *   "OnboardingCallbackService.OnEffectiveThemeChanged").
 * @param handler - Async handler invoked with the inbound Protobuf bytes.
 */
export function registerCallbackHandler(fqn: string, handler: CallbackHandler): void {
    handlers.set(fqn, handler);
}

/**
 * Install `window.__dispatchCallback(method, bytes)` (called by Swift via
 * structured invocation; `bytes` is a base64 string). MUST be called exactly
 * once per PoC window before the first Swift→TS push arrives.
 */
export function installCallbackDispatch(): void {
    window.__dispatchCallback = async (method: string, bytes: string): Promise<void> => {
        const handler = handlers.get(method);
        if (!handler) {
            console.error(`[callbackDispatch] No handler for "${method}" — dropping`);
            return;
        }
        try {
            // Decode inside the guarded region: `atob` throws on malformed
            // input, and a throw here would reject the Swift-side push,
            // violating the fire-and-forget contract (errors are logged).
            const payload = base64ToBytes(bytes);
            await handler(payload);
        } catch (err) {
            console.error(`[callbackDispatch] Handler "${method}" threw:`, err);
        }
    };
}

/**
 * Test helper: clears the registered handlers.
 */
export function __resetForTests(): void {
    handlers.clear();
}
