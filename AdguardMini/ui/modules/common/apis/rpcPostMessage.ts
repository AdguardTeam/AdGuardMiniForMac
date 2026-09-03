// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { base64ToBytes, bytesToBase64 } from './bridgeBytes';

/** Default RPC reply timeout (ms). */
export const DEFAULT_RPC_TIMEOUT_MS = 600_000;

/** Consecutive-timeout alert threshold. */
export const CONSECUTIVE_TIMEOUT_THRESHOLD = 3;

/**
 * Transport-level RPC failure (timeout, unavailable handler, undecodable
 * reply, or a native-side rejection). Tagged class so the runtime-error
 * reporter can route RPC failures to the non-fatal native surface instead
 * of the "WebView failure" restart alert.
 */
export class RpcError extends Error {
    /**
     * Native-side rejection reason code (`window.__rejectRpc` third
     * argument, e.g. `'oversized'` / `'no-service'` / `'malformed'`), when
     * the failure is a bridge-level rejection.
     */
    public readonly reason?: string;

    /** Constructs a tagged RPC transport failure. */
    constructor(message?: string, reason?: string) {
        super(message);
        // Distinct `name` keeps the class recognizable in serialized output
        // (console, logs, telemetry) where the prototype chain is lost.
        this.name = 'RpcError';
        this.reason = reason;
    }
}

/** Resolver for `window.__resolveRpc(id, bytes)`. */
type ResolveFn = (id: number, bytes: string) => void;

interface PendingEntry {
    resolve(bytes: Uint8Array): void;
    reject(err: Error): void;
    timer: ReturnType<typeof setTimeout>;
}

let nextId = 1;
const pending = new Map<number, PendingEntry>();

/** Current consecutive-timeout count. */
let consecutiveTimeoutCount = 0;

/** Alert surface triggered at timeout threshold. */
let rpcTimeoutAlertSurface: (() => void) | null = null;

/** Install timeout alert-surface hook. */
export const __installRpcTimeoutAlertSurface = (surface: (() => void) | null): void => {
    rpcTimeoutAlertSurface = surface;
};

/** Return installed alert surface. */
export const __getRpcTimeoutAlertSurface = (): (() => void) | null => rpcTimeoutAlertSurface;

/** Settle the pending entry with an error, resetting the timeout counter. */
const settleWithError = (entry: PendingEntry, message: string, reason?: string): void => {
    entry.reject(new RpcError(message, reason));
    consecutiveTimeoutCount = 0;
};

/** Make one TS->Swift RPC call. */
export const rpcCall = async (methodName: string, bytes: Uint8Array): Promise<Uint8Array> => {
    return new Promise<Uint8Array>((resolve, reject) => {
        const id = nextId++;
        const timer = setTimeout(() => {
            pending.delete(id);
            consecutiveTimeoutCount += 1;
            if (consecutiveTimeoutCount === CONSECUTIVE_TIMEOUT_THRESHOLD) {
                rpcTimeoutAlertSurface?.();
            }
            reject(new RpcError(`RPC "${methodName}" timed out after ${DEFAULT_RPC_TIMEOUT_MS} ms`));
        }, DEFAULT_RPC_TIMEOUT_MS);

        const entry: PendingEntry = { resolve, reject, timer };
        pending.set(id, entry);

        // Guard webkit-absent hosts.
        const rpc = window.webkit?.messageHandlers?.rpc;
        if (!rpc) {
            clearTimeout(timer);
            pending.delete(id);
            // An immediate local failure is not a timeout: break the streak
            // so a recovered page does not spuriously hit the alert.
            settleWithError(entry, `RPC "${methodName}": window.webkit.messageHandlers.rpc unavailable`);
            return;
        }
        try {
            // `postMessage` bodies must be plist-compatible: encode the
            // payload as base64 so Swift decodes it via `Data(base64Encoded:)`
            // instead of re-assembling a bridged indexed dictionary.
            rpc.postMessage({ id, method: methodName, bytes: bytesToBase64(bytes) });
        } catch (err) {
            // A synchronous `postMessage` throw (oversized/unserializable
            // body, WebKit state error) must not leave the timer running and
            // the pending entry leaking — reject and clean up immediately so
            // the timeout alert is not spuriously triggered later.
            clearTimeout(timer);
            pending.delete(id);
            // An immediate local failure is not a timeout: break the streak.
            settleWithError(entry, err instanceof Error ? err.message : String(err));
        }
    });
};

/** Install and return `window.__resolveRpc(id, bytes)` resolver. */
export const __installResolveRpc = (): ResolveFn => {
    const resolver: ResolveFn = (id, bytes) => {
        const entry = pending.get(id);
        if (entry) {
            clearTimeout(entry.timer);
            pending.delete(id);
            consecutiveTimeoutCount = 0;
            try {
                entry.resolve(base64ToBytes(bytes));
            } catch (err) {
                // `base64ToBytes` throws on malformed payloads (see its
                // docblock): reject instead of leaving the promise pending
                // forever — the timer is already cleared above.
                entry.reject(err instanceof Error ? new RpcError(err.message) : new RpcError(String(err)));
            }
        }
    };
    window.__resolveRpc = resolver;
    window.__rejectRpc = (id: number, message: string, reason?: string) => {
        const entry = pending.get(id);
        if (entry) {
            clearTimeout(entry.timer);
            pending.delete(id);
            // Include the reason code in the message text: telemetry and the
            // unified log ship `err.message`, and call sites rarely catch to
            // read the structured `reason` field.
            const suffix = reason ? ` (${reason})` : '';
            settleWithError(entry, `RPC "${message}" was rejected by the native side${suffix}`, reason);
        }
    };
    return resolver;
};

/** Test helper: reset pending state. */
export const __resetForTests = (): void => {
    for (const entry of pending.values()) {
        clearTimeout(entry.timer);
    }
    pending.clear();
    nextId = 1;
    consecutiveTimeoutCount = 0;
    rpcTimeoutAlertSurface = null;
};
