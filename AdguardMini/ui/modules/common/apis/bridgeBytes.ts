// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Decode a base64 string into a `Uint8Array`.
 *
 * The native side (`WKWebViewBridge`) ships binary RPC payloads to the page
 * as base64 strings: `WKWebView.callAsyncJavaScript` accepts only
 * plist-compatible argument values, so a raw `Data` argument is rejected
 * with a `WKErrorDomain` error. This restores the `Uint8Array` contract
 * that every RPC consumer (`processResponse`, `deserializeBinary`) expects.
 *
 * @param base64 - The base64-encoded payload as sent by the native side.
 * @returns The decoded payload bytes.
 */
export const base64ToBytes = (base64: string): Uint8Array => {
    // `atob` throws an `InvalidCharacterError` on malformed input (e.g. a
    // truncated payload or a native/web version mismatch). Annotate it so a
    // caller (e.g. `__resolveRpc`) can surface a descriptive error instead of
    // silently hanging the pending RPC.
    let binary: string;
    try {
        binary = atob(base64);
    } catch (err) {
        throw new Error(`base64ToBytes: invalid base64 payload: ${err}`);
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};
