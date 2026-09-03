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

/**
 * Encode bytes as a base64 string.
 *
 * The page ships binary RPC request payloads to the native side
 * (`WKWebViewBridge`) as base64 strings: `WKScriptMessage` bodies must be
 * plist-compatible, and a raw `Uint8Array` bridges into an indexed
 * dictionary of `NSNumber`s, which is wasteful for large payloads (e.g.
 * rule imports) and relies on undocumented WebKit bridging. Encoding here
 * mirrors the native reply direction (`bytesArgument` in `WKWebViewBridge`)
 * and gives Swift a single, deterministic `Data(base64Encoded:)` decode.
 *
 * @param bytes - The payload bytes.
 * @returns The base64-encoded payload string.
 */
export const bytesToBase64 = (bytes: Uint8Array): string => {
    // Chunk the conversion so large payloads (user-rules imports) neither
    // overflow the call stack (spread) nor build a full-length binary
    // intermediate before encoding. Each chunk length is a multiple of 3,
    // so concatenated `btoa` outputs carry no inter-chunk `=` padding.
    const chunkSize = 0x7FFE; // 32766 = 3 × 10922
    let base64 = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        base64 += btoa(String.fromCharCode(...chunk));
    }
    return base64;
};
