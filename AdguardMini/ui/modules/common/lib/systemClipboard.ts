// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/** Clipboard surface installed on `window.SystemClipboard`. */
export interface SystemClipboardBridge {
    /** Write text to the system clipboard. */
    write(text: string): void;
    /** Alias of {@link write}. */
    writeText(text: string): void;
    /** Read the current system clipboard content. */
    read(): Promise<string>;
}

/** Time after which a pending clipboard read resolves empty if Swift never
 *  replies (the reply must not hang the caller forever). */
const READ_REPLY_TIMEOUT_MS = 5000;

let nextReadRequestId = 1;
const pendingReads = new Map<number, { resolve(text: string): void; timer: ReturnType<typeof setTimeout> }>();

/** Test helper: drop pending reads and reset the id counter. */
export const __resetSystemClipboardBridgeForTests = (): void => {
    for (const pending of pendingReads.values()) {
        clearTimeout(pending.timer);
    }
    pendingReads.clear();
    nextReadRequestId = 1;
};

/** Install Swift-backed `window.SystemClipboard`; falls back to `navigator.clipboard`
 *  when the Swift message handlers are unavailable.
 */
export function installSystemClipboardBridge(): SystemClipboardBridge {
    // Swift delivers reads via `window.__resolveSystemClipboardRead(id, text)`.
    window.__resolveSystemClipboardRead = (id, text) => {
        const pending = pendingReads.get(id);
        if (pending) {
            clearTimeout(pending.timer);
            pendingReads.delete(id);
            pending.resolve(text);
        }
    };

    // Guard webkit-absent hosts.
    const writeHandler = window.webkit?.messageHandlers?.systemClipboard;
    const readHandler = window.webkit?.messageHandlers?.systemClipboardRead;

    const bridge: SystemClipboardBridge = {
        write(text: string) {
            if (writeHandler) {
                writeHandler.postMessage(text);
                return;
            }
            // `navigator.clipboard` may be absent (non-secure context, older
            // WKWebView, node test runners) and `writeText` may reject
            // (NotAllowedError); guard availability and swallow the rejection
            // so the copy buttons never throw.
            void navigator.clipboard?.writeText(text)?.catch(() => undefined);
        },
        writeText(text: string) {
            // Documented alias — delegate so the Swift-first fallback logic
            // stays in a single place and cannot diverge.
            this.write(text);
        },
        read: async (): Promise<string> => {
            // Prefer the Swift pasteboard: the WebKit async clipboard API
            // (`navigator.clipboard.readText`) is not granted to WKWebView
            // pages, so it rejects with NotAllowedError on every read.
            if (readHandler) {
                return new Promise<string>((resolve) => {
                    const id = nextReadRequestId++;
                    const timer = setTimeout(() => {
                        const pending = pendingReads.get(id);
                        if (pending) {
                            pendingReads.delete(id);
                            resolve('');
                        }
                    }, READ_REPLY_TIMEOUT_MS);
                    pendingReads.set(id, { resolve, timer });
                    readHandler.postMessage({ id });
                });
            }
            // Fallback for non-Swift hosts (dev env, tests).
            if (!navigator.clipboard?.readText) {
                return '';
            }
            return navigator.clipboard.readText().catch(() => '');
        },
    };

    window.SystemClipboard = bridge;
    return bridge;
}
