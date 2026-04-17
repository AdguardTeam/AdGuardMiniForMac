// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

type PopupParams = { anchorAt: number; popupAt: number; x?: number; y?: number };

type ScreenBoxWhat = 'frame' | 'workarea' | 'device' | 'isPrimary' | 'snapshot';

type ElementState = { popup: boolean };

interface HTMLElement {
    /**
     * @link https://bit.int.agrd.dev/projects/SCITER/repos/sciter-source/browse/sdk.js/docs/md/Element.md#271,273,276-277,279,345
     */
    popup(popup: Element, params: PopupParams): void;
    /**
     * @link https://bit.int.agrd.dev/projects/SCITER/repos/sciter-source/browse/sdk.js/docs/md/Element.State.md
     */
    state: ElementState;
}

interface HTMLInputElement {
    /**
     * @link https://bit.int.agrd.dev/projects/SCITER/repos/sciter-source/browse/sdk.js/docs/md/behaviors/behavior-edit.md#61
     */
    edit: {
        /**
         * Selects text between start (included) and end (excluded) position.
         * If start and end are omitted - removes selection.
         * @param start
         * @param end
         */
        selectRange(start?: number, end?: number): boolean;
        /**
         * Insert text at caret position, if selection is not empty removes selected text before insertion.
         * @param text
         */
        insertText(text: string): void;
        /**
         * Appends the text at the end of existing text.
         * @param text
         */
        appendText(text: string): void;
        /**
         * Select whole content.
         */
        selectAll(): void;
        /**
         * Removes selected text (if any)
         */
        removeText(): void;
    };
}

interface HTMLWebViewElement {
    webview: {
        /**
         * Inject HTML string into WebView
         */
        loadHtml(html: string): void;

        /**
         * Execute JS code inside the WebView
         */
        evaluateJavaScript(js: string): void;
    };

    /**
     * Designed for the interaction between Sciter WebView and Browser Web Pages.
     * It's called from web pages loaded by webview. All parameters are passed to webview.jsBridgeCall.
     */
    jsBridgeCall(params: [eventName: string, ...eventParams: unknown[]]): void;
}

interface Window {
    /**
     * Designed for the interaction between Sciter WebView and Browser Web Pages.
     * It's called from web pages loaded by webview. All parameters are passed to webview.jsBridgeCall.
     */
    jsBridgeCall(eventName: string, ...eventParams: unknown[]): void;
    FALLBACK_MODE: boolean;
}

declare type SciterWindow = {
    document: Document;

    /**
     * Subscribe to window related events
     */
    on(eventName: 'activate', handler: (event: { reason: number }) => void): void;
    on(eventName: 'move', handler: (event: Event) => void): void;
    on(eventName: 'size', handler: (event: Event) => void): void;
    on(eventName: string, handler: (event: CustomEvent) => void): void;

    /**
     * Unsubscribe event handler either by name, namespace or handler reference
     */
    off(eventName: 'activate'): void;
    off(eventName: string | ((event: CustomEvent) => void)): void;
    off(eventName: string, handler: ((event: CustomEvent) => void)): void;

    /**
     * Post the event to the window asynchronously.
     * The function returns immediately - does not wait for the event consumption.
     */
    postEvent(event: CustomEvent): void;

    /**
     * Set input focus on window
     */
    activate(bringToFront: boolean): void;

    /**
     * Request to close the window
     */
    close(): void;

    /**
     * Opens file selection dialog
     */
    selectFile(params: Sciter.FS.SelectFileParams): string;

    /**
     * Window state
     */
    state: number;

    /**
     * Window caption
     */
    caption: string;

    /**
     * Window minimum size
     */
    minSize: [number, number];

    /**
     * Window is resizable
     */
    isResizable: boolean;

    /**
     * Window is maximizable
     */
    isMaximizable: boolean;

    /**
     * Window box
     */
    box(boxPart: BoxPart, boxOf?: BoxOf, relTo?: RelTo, asPPX?: boolean): number | number[];

    /**
     * Reports geometry of monitor this window is on
     *
     * @link https://docs.sciter.com/docs/DOM/Window#screenbox
     */
    screenBox(what: ScreenBoxWhat, boxPart?: BoxPart, asPPX?: boolean): number | number[] | string | boolean;

    /**
     * Move/size window. Parameters are in PPX (physical screen pixels).
     * If "client" is provided then x, y, width, height are treated as window client area coordinates.
     *
     * @link https://docs.sciter.com/docs/DOM/Window#move
     */
    move(x: number, y: number, width?: number, height?: number, client?: 'client'): void;

    /**
     * Move/size window to specific monitor using monitor-relative coordinates.
     *
     * @link https://docs.sciter.com/docs/DOM/Window#moveto
     */
    moveTo(monitor: number, x: number, y: number, width: number, height: number): void;

    /**
     * Monitor index this window is on
     */
    monitor: number;
};
