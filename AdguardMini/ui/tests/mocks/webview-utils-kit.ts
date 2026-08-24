// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Node-test stub for the `@adg/webview-utils-kit` package. The real package
 * (`packages/webview-utils-kit`) is a TypeScript source package whose entry
 * (`src/index.ts`) is not Node-loadable in the test runner. Production
 * resolves `@adg/webview-utils-kit` to the real package via webpack; only
 * `tsconfig.node-tests.json` maps it here.
 *
 * The type-only import of the real `vendor/index.d.ts` keeps its
 * `declare global` blocks (`log`, `window.xcallWrapper`, `HTMLLottieElement`)
 * active for the compilation; only the runtime value surface is stubbed.
 */

import type * as RealKit from '../../packages/webview-utils-kit/vendor/index';

import type { Message as ProtobufMessage } from 'google-protobuf';

export type { Logger } from '../../packages/webview-utils-kit/vendor/Logger/Logger';

/**
 * Runtime stand-in for the vendored `LogLevel` enum. The real enum is used
 * as a VALUE by the tray `Settings` store module (`LogLevel.DBG` /
 * `LogLevel.ERR`), so the mock must export the same members.
 */
export enum LogLevel {
    DBG = 0,
    INF = 1,
    ERR = 2,
}

/**
 * Runtime stand-in for the vendored `HiddenStringValue` container
 * (used by `Apis/ExtendLicense` to mask license keys).
 */
export class HiddenStringValue extends String {
    private readonly hidden: string;

    public constructor(publicValue = '', hiddenValue = '') {
        super(publicValue);
        this.hidden = hiddenValue;
    }

    /** Length of the public (visible) string. */
    public get publicLength(): number {
        return this.length;
    }

    /** Length of the hidden (masked) string. */
    public get hiddenLength(): number {
        return this.hidden.length;
    }

    public getHiddenValue(): string {
        return this.hidden;
    }

    public isEqual(other: HiddenStringValue | string): boolean {
        const otherHidden = typeof other === 'string' ? other : other.getHiddenValue();
        return this.hidden === otherHidden;
    }
}

import type {
    LottieAnimationData,
    UseLottieElementParams,
} from '../../packages/webview-utils-kit/vendor/hooks/useLottieElement';
export type {
    LottieAnimationData,
    UseLottieElementParams,
};

/**
 * Recording stub for `preloadLottie` (the real implementation builds a
 * `lottie-web` `AnimationItem`, which needs a DOM renderer). The adapter
 * test asserts the recorded calls to verify the onboarding steps preload
 * their animation data into the container element before playing.
 */
const lottiePreloadCalls: Array<{ el: unknown; animationData: unknown }> = [];

/**
 * Reset the `preloadLottie` call log (between tests).
 */
export const __resetLottiePreloadCalls = (): void => {
    lottiePreloadCalls.length = 0;
};

/**
 * Get the recorded `preloadLottie` invocations.
 *
 * @returns Array of `{ el, animationData }` records, in call order.
 */
export const __getLottiePreloadCalls = () => lottiePreloadCalls;

/**
 * Stub of `preloadLottie` — records the call instead of loading the
 * animation, so node tests can verify the preload glue without a DOM.
 *
 * @param el Container element the animation would render into.
 * @param animationData Lottie JSON data for the asset to render.
 */
export function preloadLottie(el: HTMLElement, animationData: LottieAnimationData): void {
    lottiePreloadCalls.push({ el, animationData });
}

/**
 * Stub of `useLottieElement` — returns a no-op `play` so onboarding
 * components render in node tests without a Lottie runtime.
 *
 * @param _elLottieRef Ref to the Lottie container element (unused).
 * @returns `{ play }` no-op surface matching the real hook.
 */
export function useLottieElement(_elLottieRef: UseLottieElementParams['elLottieRef']): {
    play: (settings: unknown, onNext?: () => void) => void;
} {
    return { play: () => {} };
}

/**
 * Clamp a value between min and max (mirrors `@adg/webview-utils-kit`'s
 * `clamp`, used by the stories navigation reducer).
 *
 * @param value Value to clamp
 * @param min Lower bound
 * @param max Upper bound
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Minimal `ApiServiceExecutor` stand-in. Exists so the global
 * `Window.API` declaration in `@types/declaration.d.ts` resolves under the
 * test config; tests stub `window.API.Execute` directly (e.g. via
 * `globalThis.API`), so this implementation is never invoked.
 */
export class ApiServiceExecutor {
    /**
     * Executes the given API request.
     *
     * @param request API request to execute (ignored — the transport is
     *   stubbed by each test).
     * @returns Processed response from the API request.
     */
    public async Execute<
        ReturnValue extends ProtobufMessage,
        RequestMessage extends ProtobufMessage,
    >(
        request: PlatformRequest<ReturnValue, RequestMessage>,
    ): Promise<ReturnValue> {
        void request;
        throw new Error('window.API must be stubbed in tests');
    }
}

/**
 * Minimal `PlatformRequest` stand-in. Generated request classes extend it and
 * only set `requestMessage` + override `FQN` / `processResponse`; the tests
 * stub `window.API.Execute` entirely, so the transport is never invoked.
 */
export abstract class PlatformRequest<
    ReturnValue extends ProtobufMessage = ProtobufMessage,
    RequestMessage extends ProtobufMessage = ProtobufMessage,
> {
    protected requestMessage?: RequestMessage;

    /** Whether request/response data is logged (mirrors the real Package surface). */
    public get loggingEnabled(): boolean {
        return true;
    }

    /** Returns the request message to send. */
    public getRequestMessage(): RequestMessage {
        if (!this.requestMessage) {
            throw new Error('Request message is not initialized');
        }
        return this.requestMessage;
    }

    /** Returns the fully-qualified service method name. */
    public abstract get FQN(): string;

    /** Deserializes the response bytes. */
    public abstract processResponse(bytes: Uint8Array): ReturnValue;
}

