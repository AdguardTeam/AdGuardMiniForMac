// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { rpcCall, __installResolveRpc } from './rpcPostMessage';

export type Bytes = ArrayBufferLike;

type XCallCallback = (promiseResult: boolean, binary: ArrayBuffer) => void;

// @TODO: move to declarations?
export interface IAPI_CALL {
    xcall(methodName: string, binaryMessage: Bytes, callback: XCallCallback): Promise<Uint8Array>;
}

/**
 * WKWebView backend relay wrapper.
 *
 * Routes via the RPC channel (`rpcPostMessage.rpcCall`). The
 * `window.webkit.messageHandlers.rpc` handler MUST be registered;
 * an absent handler throws an error.
 *
 * @param methodName - Fully-qualified method name.
 * @param binaryParam - Protobuf-encoded request bytes.
 * @returns Promise resolving to the Protobuf-encoded response bytes.
 */
export const xcall = async (methodName: string, binaryParam: Bytes): Promise<Uint8Array> => {
    const rpc = window.webkit?.messageHandlers?.rpc;

    if (!rpc) {
        throw new Error(`rpc message handler is not registered; cannot invoke ${methodName}`);
    }

    __installResolveRpc();
    return rpcCall(methodName, new Uint8Array(binaryParam as ArrayBuffer));
};

/**
 * Alias of `xcall`. The codegen templates emit
 * `import { postMessage } from 'ApiWindow'` (the renamed
 * `xcall_method_name` in `typescript.json`).
 */
export { xcall as postMessage };
