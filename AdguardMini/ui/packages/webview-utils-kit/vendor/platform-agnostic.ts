// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  platform-agnostic.ts
//  AdguardMini
//

/** ES-module shim re-exporting platform-agnostic helpers from CJS bundle. */

import * as utilsKit from './utils-kit';

const {
    clamp,
    isString,
    useEnter,
    useEscape,
    useClickOutside,
    useScrollListener,
    useSearch,
    focusOnBody,
    propagationStopper,
    isInitializedString,
    isObjectNonNull,
    createI18nInstance,
    createTranslatorShortcut,
    loggerColors,
    getFailedMethodNameFromError,
    instantiateLogger,
    LogLevel,
    KEYBOARD_CODES,
    HiddenStringValue,
} = utilsKit;

export {
    clamp,
    isString,
    useEnter,
    useEscape,
    useClickOutside,
    useScrollListener,
    useSearch,
    focusOnBody,
    propagationStopper,
    isInitializedString,
    isObjectNonNull,
    createI18nInstance,
    createTranslatorShortcut,
    loggerColors,
    getFailedMethodNameFromError,
    instantiateLogger,
    LogLevel,
    KEYBOARD_CODES,
    HiddenStringValue,
};
