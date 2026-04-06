// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

declare module 'mobx-preact';
declare module 'SciterPolyfills';

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

declare const DEV: any;
declare const WITH_PINGS: any;
declare const FULL_LOGS: boolean;
declare const WEB_BUILD: boolean;

declare const VERSION: any;

declare const MIN_WIDTH: number;
declare const MIN_HEIGHT: number;

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
declare const cx: typeof import('classix').default;

/**
 * Sciter-specific global object interface
 */
interface SciterGlobal {
    /**
     * Creates a new sciter window instance
     */
    new(params: {
        // Screen pixels, window width
        width: number;
        // Screen pixels, window height
        height: number;
        // Window caption (or title)
        caption?: string;
        // Window html source code file
        url: string;
        // Extra parameters to pass to the new window
        parameters?: any;
        // Instance of parent (owner window)
        // When owner will be closed or minimized this window will be closed/minimized too
        parent?: SciterWindow;
    }): SciterWindow;

    /**
     * Window is shown normally
     */
    WINDOW_SHOWN: 1;
    /**
     * Window is hidden (not visible)
     */
    WINDOW_HIDDEN: 4;
    /**
     * Sciter window instance
     */
    this: SciterWindow;
    /**
     * All sciter window instances
     */
    all: SciterWindow[];
}

interface Window {
    /**
     * Decodes the bytes array into a string
     *
     * @param bytes - bytes array to decode
     * @param encoding - encoding to use for decoding
     */
    decode(bytes: ArrayBuffer, encoding?: string): string;
    /**
     * Opens a link in the default browser
     *
     * @param link - link to open
     */
    OpenLinkInBrowser(link: string): void;
    /**
     * Sets the unhandled exception handler
     *
     * @param f - handler function
     */
    setUnhandledExeceptionHandler(f: (err: Error) => void): void;
    /**
     * Returns the SciterGlobal instance
     */
    SciterGlobal: SciterGlobal;
    /**
     * Generates a UUID
     */
    GenerateUuid(): string;
    /**
     * Detect platform. Use only for debugging purposes!
     *
     * https://bit.int.agrd.dev/projects/SCITER/repos/sciter-source/browse/sdk.js/docs/md/module-env.md
     */
    PLATFORM: 'OSX';
    /**
     * Returns [dirpath:string, file:string]
     *
     * @link https://bit.int.agrd.dev/projects/SCITER/repos/sciter-source/browse/sdk.js/docs/md/sys.fs/splitpath.md
     *
     * @param path
     */
    splitPath(path: string): [string, string];
    /**
     * Returns the SciterWindow instance
     */
    SciterWindow: SciterWindow;
    /**
     * Returns the path to the Applications directory
     */
    ApplicationsPath: string;
    /**
     * Returns the path to the Documents directory
     */
    DocumentsPath: string;
    /**
     * TODO: describe
     */
    WindowProperties: any;
    /**
     * @link https://bit.int.agrd.dev/projects/SCITER/repos/sciter-source/browse/sdk.js/docs/md/Clipboard.md
     */
    SystemClipboard: SystemClipboard;
    /**
     * Logger instance
     */
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    log: import('@adg/sciter-utils-kit').Logger;
}

interface Console {
    /**
     * Unhandled exceptions handler, all not handled exceptions go here.
     * This function can be overriden to implement custom handler.
     */
    reportException(error: Error, isPromise: boolean): void;
}
