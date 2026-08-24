// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { base64ToBytes } from './bridgeBytes';

/** Default RPC reply timeout (ms). */
export const DEFAULT_RPC_TIMEOUT_MS = 600_000;

/** Consecutive-timeout alert threshold. */
export const CONSECUTIVE_TIMEOUT_THRESHOLD = 3;

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
            reject(new Error(`RPC "${methodName}" timed out after ${DEFAULT_RPC_TIMEOUT_MS} ms`));
        }, DEFAULT_RPC_TIMEOUT_MS);

        pending.set(id, { resolve, reject, timer });

        // Guard webkit-absent hosts.
        const rpc = window.webkit?.messageHandlers?.rpc;
        if (!rpc) {
            clearTimeout(timer);
            pending.delete(id);
            reject(new Error(`RPC "${methodName}": window.webkit.messageHandlers.rpc unavailable`));
            return;
        }
        try {
            rpc.postMessage({ id, method: methodName, bytes });
        } catch (err) {
            // A synchronous `postMessage` throw (oversized/unserializable
            // body, WebKit state error) must not leave the timer running and
            // the pending entry leaking — reject and clean up immediately so
            // the timeout alert is not spuriously triggered later.
            clearTimeout(timer);
            pending.delete(id);
            reject(err instanceof Error ? err : new Error(String(err)));
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
            entry.resolve(base64ToBytes(bytes));
        }
    };
    window.__resolveRpc = resolver;
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
