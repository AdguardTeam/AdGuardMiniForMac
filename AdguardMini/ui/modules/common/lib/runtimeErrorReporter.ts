// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/** Install global runtime error forwarding to Swift `jsRuntimeError`. */
/* eslint-disable no-console */

/** Diagnostic class carried by `jsRuntimeError` posts. */
export type JsRuntimeErrorKind = 'csp-violation';

/** Swift `jsRuntimeError` payload shape. */
export interface JsRuntimeErrorBody {
    message: string;
    stack?: string;
    /**
     * Diagnostic class when the post is not a genuine runtime error.
     * `'csp-violation'` marks `securitypolicyviolation` reports so the
     * platform can log/telemetry them without surfacing the fatal
     * WebView-load-failure alert (a blocked inline style is not a load
     * failure).
     */
    kind?: JsRuntimeErrorKind;
}

/** Post function for `jsRuntimeError` channel. */
export type JsRuntimeErrorSink = (body: JsRuntimeErrorBody) => void;

/**
 * Safely stringify a non-`Error` rejection reason for the native log.
 * `JSON.stringify` fails for circular references / BigInt and `String(obj)`
 * yields `[object Object]`, so fall back through both before giving up.
 */
function stringifyReason(value: unknown): string {
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'string') {
        return value;
    }
    try {
        const json = JSON.stringify(value);
        return json === undefined ? String(value) : json;
    } catch {
        return String(value);
    }
}

/** Handlers installed via `window.setUnhandledExceptionHandler`. */
const supplementaryErrorHandlers: Array<(err: unknown) => void> = [];

/** Install global error listeners and return posting seam. */
export function installRuntimeErrorReporter(): JsRuntimeErrorSink {
    const postToJsRuntimeError: JsRuntimeErrorSink = (body) => {
        try {
            // Guard webkit-absent hosts.
            window.webkit?.messageHandlers?.jsRuntimeError?.postMessage(body);
        } catch {
            // Reporting must not break caller.
        }
    };

    const postRuntimeErrorToSwift = (err: unknown): void => {
        // Skip the post for `undefined` reasons (no diagnostic value).
        if (err === undefined) {
            return;
        }
        const message = err instanceof Error ? err.message : stringifyReason(err);
        const stack = err instanceof Error ? err.stack : undefined;
        postToJsRuntimeError({ message, stack });
    };

    window.addEventListener('error', (evt: ErrorEvent) => {
        if (evt.error) {
            console.error('[global error]', evt.error);
            postRuntimeErrorToSwift(evt.error);
        } else {
            // Some script errors carry no Error object (e.g. cross-origin
            // scripts reported as "Script error."); still log the message so
            // the failure is not silently dropped.
            console.error('[global error]', evt.message);
            postRuntimeErrorToSwift(evt.message || 'Unknown script error');
        }
        for (const handler of supplementaryErrorHandlers) {
            handler(evt.error);
        }
    });
    window.addEventListener('unhandledrejection', (evt: PromiseRejectionEvent) => {
        const reason = evt.reason;
        console.error('[unhandled rejection]', reason);
        postRuntimeErrorToSwift(reason);
        for (const handler of supplementaryErrorHandlers) {
            handler(reason);
        }
    });

    // Correctly-spelled public API name. Repeated calls just append a
    // handler: the two window listeners above are not duplicated, so
    // installing twice cannot double-report to Swift.
    window.setUnhandledExceptionHandler = (handler: (err: unknown) => void) => {
        supplementaryErrorHandlers.push(handler);
    };

    return postToJsRuntimeError;
}
