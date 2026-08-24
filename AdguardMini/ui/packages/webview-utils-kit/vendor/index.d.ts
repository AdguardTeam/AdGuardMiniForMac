export * from './types';
export * from './containers';
export * from './crypto';
export * from './DOM';
export * from './Logger';
export * from './string';
export * from './number';
export * from './validators';
export * from './components';
export * from './constants';
export * from './hooks';
export * from './classes';
export * from './i18n';
export * from './apis';

declare global {
    const log: import('./Logger/Logger').Logger;
    interface Window {
        log: WindowLogSurface;
        SciterGlobal: SciterGlobal;
        /** Overridable xcall wrapper (native by default). */
        xcallWrapper: XcallImplementation;
    }
}

declare module '*.html' {
    const content: string;
    export default content;
}
declare global {
    type HTMLLottieElement = HTMLElement & {
        lottie: {
            play(firstFrame: number, lastFrame: number): boolean;
            loop: boolean;
            markers: number[][];
            speed: number;
        };
    };
}

type SelectFileParams = {
    mode: 'save' | 'open',
    filter?: string,
    extension?: string,
    caption: string,
    path: string
};
type BoxPart = 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height' | 'xywh' | 'rectw' | 'rect' | 'position' | 'dimension';
type BoxOf = 'border' | 'client' | 'cursor' | 'caret';
type RelTo = 'desktop' | 'monitor' | 'self';
/** Public xcall-like API wrapper signature. */
type XcallImplementation = (methodName: string, binaryMessage: ArrayBufferLike) => Promise<Uint8Array>;
/**
 * Legacy Sciter window handles. Exported so the tray component types
 * (which reference `SciterWindow`) can import it instead of relying on an
 * unavailable module-global.
 */
export type SciterWindow = {
    /** Subscribe to window events. */
    on<T = any>(
        eventName: string,
        handler: (event: CustomEvent<T> & { reason: boolean; data: { screenX: number, screenY: number; }; }) => void
    ): void;
    /** Unsubscribe from window events. */
    off<T = any>(eventName: string, handler: (event: CustomEvent<T>) => void): void;
    /** Post event asynchronously (non-blocking). */
    postEvent(event: CustomEvent): void;
    /** Set input focus on window. */
    activate(bringToFront: boolean): void;
    /** Request window close. */
    close(): void;
    /** Minimal resizable size `[width, height]`. */
    minSize: [number, number];
    /** Parent (owner) window. */
    parent: SciterWindow;
    /** Extra constructor parameters. */
    parameters?: any;
    /** File open/save dialog. */
    selectFile(params: SelectFileParams): string;
    /** Window state. */
    state: number;
    /** Report window geometry. */
    box(boxPart: BoxPart, boxOf?: BoxOf, relTo?: RelTo, asPPX?: boolean): number | number[]
    /** Show tray icon with image and tooltip. */
    trayIcon(options: { image: any; text: string; }): void;
    /** Remove tray icon. */
    trayIcon(action: 'remove'): void;
    /** Window root document. */
    document: Document & {
        on(event: string, callback: (...args: any[]) => any): void;
        querySelector(selector: string): HTMLElement | null;
    };
    /** Move/resize window. */
    move(x: number, y: number, width?: number, height?: number): void;
    /** Physical pixels per logical CSS px (DIP). */
    devicePixelRatio: number;
};
/** Sciter-specific global object. */
interface SciterGlobal {
    /** Create a new Sciter window instance. */
    new(params: {
        // Window width in screen pixels.
        width?: number;
        // Window height in screen pixels.
        height?: number;
        // Window caption/title.
        caption?: string;
        // Window HTML source file.
        url?: string;
        // Extra parameters for the new window.
        parameters?: any;
        // Parent (owner) window.
        // Closes/minimizes with owner.
        parent?: SciterWindow;
        // Window state.
        state?: number;
        // Window type.
        type?: number;
        // Window HTML source.
        html?: string;
        // Window X position.
        x?: number;
        // Window Y position.
        y?: number;
        // Window alignment.
        alignment?: number;
    }): SciterWindow;
    /** Window is shown normally. */
    WINDOW_SHOWN: 1;
    /** Window is minimized. */
    WINDOW_MINIMIZED: 2;
    /** Window is hidden. */
    WINDOW_HIDDEN: 4;
    /** Current Sciter window instance. */
    this: SciterWindow;
    /** All Sciter window instances. */
    all: SciterWindow[];
    /** Popup window type. */
    POPUP_WINDOW: number;
}
/** Sciter Graphics object. */
declare class Graphics {
    public static Image: {
        load(url: string, isSvg: boolean): any;
    };
}
declare global {
    /** Nullable type. */
    type Nullable<T> = T | null;
    /** Optional type. */
    type Optional<T> = T | undefined;
}

