// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  utils-kit.d.ts
//  AdguardMini
//

/** Runtime declaration for upstream CJS UMD bundle `vendor/utils-kit.js`. */

// Mark as module; runtime values come from CJS IIFE bundle.
export const clamp: any;
export const isString: any;
export const isDefined: any;
export const isFunction: any;
export const isInRange: any;
export const isNonEmptyString: any;
export const isNumeric: any;
export const isPositiveOrZero: any;
export const isTruthy: any;
export const isValidReferrer: any;
export const isValidUserAgent: any;
export const useEnter: any;
export const useEscape: any;
export const useClickOutside: any;
export const useScrollListener: any;
export const useSearch: any;
export const useDebouncedCallback: any;
export const focusOnBody: any;
export const propagationStopper: any;
export const stopPropagationAndFocusOnBody: any;
export const isInitializedString: any;
export const isObjectNonNull: any;
export const createI18nInstance: any;
export const createTranslatorInstance: any;
export const createTranslatorShortcut: any;
export const loggerColors: any;
export const getFailedMethodNameFromError: any;
export const instantiateLogger: any;
export const LogLevel: any;
export const KEYBOARD_CODES: any;
// Class-like runtime exports: re-export the typed declarations so callers
// keep both the value AND type meanings (constructor + type annotation).
export { HiddenStringValue } from './containers/HiddenStringValue';
export const cloneDeep: any;
export const castNumber: any;
export const rot13: any;
export const rot13CharCode: any;
export const wrapWithNewLines: any;
export const decrypt: any;
export const encrypt: any;
export const handleFuseSearch: any;
export { RingBuffer } from './containers/RingBuffer';
export const SearchState: any;
