// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.mp4';
declare module '*.wmv';
declare module '*.webm';
declare module '*.wasm';
declare module '*.html';

declare module '*.css' {
    const content: { [className: string]: string };
    export default content;
}

declare module '*.pcss' {
    const content: { [className: string]: string };
    export default content;
}

declare const DEV: boolean;
declare const FULL_LOGS: boolean;
declare const WEB_BUILD: boolean;

declare const MIN_WIDTH: number;
declare const MIN_HEIGHT: number;

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
declare const cx: typeof import('classix').default;

/**
 * WKWebView message handlers registered on the Swift side by
 * `WKWebViewAppHost`. Only the handlers actually used by the migrated
 * UI modules are declared; optional entries are absent in tests and in
 * windows that do not register them.
 */
interface WebKitMessageHandlers {
    /** Opens a link in the default browser (Swift `NSWorkspace`). */
    openLinkInBrowser: { postMessage(url: string): void };
    /** TS→Swift Protobuf RPC channel (`rpcPostMessage`). */
    rpc?: { postMessage(message: unknown): void };
    /** Console→Swift `jsLog` mirroring channel (`logBridge`). */
    jsLog?: { postMessage(message: { level: string; message: string }): void };
    /** Uncaught-error → Swift `jsRuntimeError` channel (`runtimeErrorReporter`). */
    jsRuntimeError?: {
        postMessage(body: { message: string; stack?: string; kind?: string }): void;
    };
    /** Clipboard → Swift `NSPasteboard` channel (`systemClipboard`). */
    systemClipboard?: { postMessage(text: string): void };
    /** Clipboard read request → Swift `NSPasteboard` channel (`systemClipboardRead`).
     *  The reply is delivered via `window.__resolveSystemClipboardRead`. */
    systemClipboardRead?: { postMessage(request: { id: number }): void };
    /** RPC consecutive-timeout alert channel (`rpcPostMessage`). */
    rpcTimeoutAlert?: { postMessage(body: { count: number }): void };
}

/**
 * Log surface installed on `window.log`. The bootstrap's pre-module-entry
 * fallback only routes through `console`, and the module entries swap in
 * the full vendored `Logger` (`instantiateLogger`) — structurally
 * assignable to this surface because `info` / `dbg` / `error` cover every
 * call site.
 */
interface WindowLogSurface {
    info(message: string, func?: string, ...args: unknown[]): void;
    dbg(message: string, func?: string, ...args: unknown[]): void;
    error(message: string, func?: string, ...args: unknown[]): void;
}

/**
 * Clipboard surface used by the settings copy buttons and the
 * `webView*Bootstrap` installers (routed to the Swift `NSPasteboard`
 * via the `systemClipboard` message handler).
 */
interface SystemClipboard {
    write(text: string): void | Promise<void>;
    writeText(text: string): void | Promise<void>;
    read(): Promise<string>;
}

// Only the globals installed by `webViewBootstrap.ts` (and consumed by the
// migrated UI modules) are declared here. Sciter runtime globals are gone.
interface Window {
    /**
     * Opens a link in the default browser
     *
     * @param link - link to open
     */
    OpenLinkInBrowser(link: string): void;
    /**
     * WKWebView native bridge surface (`window.webkit`), present in every
     * WKWebView runtime; `messageHandlers` are registered by the Swift
     * host (`WKWebViewAppHost`).
     */
    webkit: {
        messageHandlers: WebKitMessageHandlers;
    };
    /**
     * RPC executor installed by `modules/common/api.ts`.
     */
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    API: import('@adg/webview-utils-kit').ApiServiceExecutor;
    /**
     * Callback dispatcher installed by `callbackDispatch.installCallbackDispatch`.
     */
    __dispatchCallback(method: string, bytes: string): Promise<void>;
    /**
     * RPC resolver installed by `rpcPostMessage.__installResolveRpc`.
     */
    __resolveRpc?(id: number, bytes: string): void;
    /**
     * RPC rejector installed by `rpcPostMessage.__installResolveRpc`; Swift
     * calls it for bridge-level rejections (unregistered service, allowlist
     * denial, restricted method) so the pending RPC rejects instead of
     * resolving with an empty payload. `reason` is a short rejection code
     * (`malformed` / `oversized` / `no-service` / `undeclared` / `restricted`)
     * that lets the page distinguish a user-facing situation (e.g. an
     * oversized payload) from a programming error.
     */
    __rejectRpc?(id: number, message: string, reason?: string): void;
    /**
     * Clipboard-read resolver installed by `systemClipboard` bridge; Swift
     * replies to a `systemClipboardRead` request with the pasteboard content.
     */
    __resolveSystemClipboardRead?(id: number, text: string): void;
    /**
     * Close-request hook installed by `userrules/App.tsx` (Swift calls it
     * from `windowShouldClose`).
     */
    __closeRequested?(): void;
    /**
     * Sets the unhandled exception handler
     *
     * @param f - handler function
     */
    setUnhandledExceptionHandler(f: (err: unknown) => void): void;
    /**
     * @link https://bit.int.agrd.dev/projects/SCITER/repos/sciter-source/browse/sdk.js/docs/md/Clipboard.md
     */
    SystemClipboard: SystemClipboard;
    /**
     * Logger surface (see {@link WindowLogSurface})
     */
    log: WindowLogSurface;
}

interface Console {
    /**
     * Unhandled exceptions handler, all not handled exceptions go here.
     * This function can be overriden to implement custom handler.
     */
    reportException(error: Error, isPromise: boolean): void;
}
