// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { __installRpcTimeoutAlertSurface } from './apis/rpcPostMessage';
import { installConsoleLogForwarding } from './lib/logBridge';
import { installPreactErrorGuard } from './lib/preactErrorGuard';
import { installRuntimeErrorReporter } from './lib/runtimeErrorReporter';
import { installPolicyViolationReporter } from './policyViolationReporter';

/** Default link opener via Swift `openLinkInBrowser`. */
const defaultLaunch = (url: string): void => {
    // Guard an absent handler (non-WKWebView dev env, tests, or a host that
    // failed to inject it) so a delegated link click cannot throw a TypeError.
    window.webkit?.messageHandlers?.openLinkInBrowser?.postMessage(url);
};

/** Schemes the link-click delegation forwards to the native gate. */
const EXTERNAL_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

/**
 * Whether `href` points outside the module page. In-page/hash and relative
 * links keep their default navigation and are never posted to the native
 * gate (which would otherwise trigger a cancelled-navigation error per click).
 */
const isExternalHref = (href: string): boolean => {
    if (href.startsWith('#') || href.startsWith('/') || href.startsWith('.')) {
        return false;
    }
    const match = /^([a-z][a-z0-9+.-]*):/i.exec(href);
    if (!match) {
        // Scheme-less hrefs are treated as relative to the module page.
        return false;
    }
    return EXTERNAL_SCHEMES.has(match[1].toLowerCase());
};

/** Selectors whose native right-click menu (copy/paste) must stay available. */
const EDITABLE_TARGET_SELECTOR = [
    'input',
    'textarea',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[contenteditable="plaintext-only"]',
    // The rules editor draws its text in a `.CodeMirror` div (not an
    // input/textarea), so include it to keep the native Cut/Copy/Paste menu.
    '.CodeMirror',
].join(',');

/** Whether the context-menu target sits inside an editable field.
 *  Explicit `contenteditable="false"` elements are intentionally excluded:
 *  they are marked non-editable and keep the suppressed default menu.
 */
const isEditableTarget = (target: Element | null): boolean =>
    Boolean(target?.closest(EDITABLE_TARGET_SELECTOR));

/** Bootstrap options. */
export interface WebViewBootstrapOptions {
    env?: {
        launch?: (url: string) => void;
    };
}

/** Install WKWebView globals on `window`. */
export function webViewBootstrap({ env }: WebViewBootstrapOptions = {}): void {
    // Forward JS diagnostics to Swift `jsLog`.
    installConsoleLogForwarding();

    window.OpenLinkInBrowser = (url: string) => (env?.launch ?? defaultLaunch)(url);

    // Forward runtime errors to `jsRuntimeError`.
    const postToJsRuntimeError = installRuntimeErrorReporter();

    // Guard Preact render errors.
    installPreactErrorGuard();

    // Route RPC timeout threshold to native alert.
    __installRpcTimeoutAlertSurface(() => {
        window.webkit?.messageHandlers?.rpcTimeoutAlert?.postMessage({ count: 3 });
    });

    // Route CSP violations through the same channel, tagged as diagnostics:
    // a blocked inline style (e.g. from a third-party animation library on
    // macOS 12) is not a WebView load failure and must not raise the native
    // load-failure alert.
    installPolicyViolationReporter(window, {
        postMessage: (body) => postToJsRuntimeError({ ...body, kind: 'csp-violation' }),
    });

    // Delegate link clicks.
    document.addEventListener('click', (evt: MouseEvent) => {
        const target = evt.target as Element | null;
        const anchor = target?.closest('a[href]');
        if (!anchor) {
            return;
        }
        evt.stopPropagation();
        const href = anchor.getAttribute('href');
        if (!href || !isExternalHref(href)) {
            return;
        }
        // Prevent the anchor's default navigation: without preventDefault the
        // URL reaches NavigationPolicy as a cancelled navigation and is opened
        // through the same gate a second time (double-open in the browser).
        evt.preventDefault();
        window.OpenLinkInBrowser(href);
    });

    // Suppress the native right-click context menu (Reload, Back/Forward,
    // image actions) outside editable fields, where the native copy/paste
    // menu stays desirable. On macOS, WebKit fires the DOM `contextmenu`
    // event before presenting its system menu, so `preventDefault` keeps
    // only the page's own in-app menus reachable on empty areas.
    document.addEventListener('contextmenu', (evt: MouseEvent) => {
        if (isEditableTarget(evt.target as Element | null)) {
            return;
        }
        evt.preventDefault();
    });
}
