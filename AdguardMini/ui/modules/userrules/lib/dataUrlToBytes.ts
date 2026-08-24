// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/** Decode webpack inlined data URL into an `ArrayBuffer`.
 * @throws Error when input is not a comma-separated data URL.
 */
export const dataUrlToBytes = (dataUrl: string): ArrayBuffer => {
    const separator = dataUrl.indexOf(',');
    // Validate the header early so a non-base64 (e.g. URL-encoded) payload
    // throws a descriptive Error instead of a cryptic atob() DOMException.
    if (separator === -1 || !dataUrl.slice(0, separator).endsWith(';base64')) {
        throw new Error(`Invalid data URL: ${dataUrl.slice(0, 32)}…`);
    }
    const base64 = dataUrl.slice(separator + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};
