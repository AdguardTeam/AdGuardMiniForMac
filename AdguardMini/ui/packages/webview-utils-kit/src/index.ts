// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/** AdGuard internal fork of `@adg/webview-utils-kit` exports. */
// Platform-agnostic helpers re-exported from upstream bundle.
export * from '../vendor/platform-agnostic';
export { PlatformRequest } from './replacements/PlatformRequest';
export { ApiServiceExecutor } from './replacements/ApiServiceExecutor';
export { useLottieElement } from './replacements/useLottieElement';
export { preloadLottie, __setLoadAnimationFactory } from './replacements/useLottieElement';
export type { __LoadAnimationFactory } from './replacements/useLottieElement';
export { extractMarkerFrames } from './replacements/lottieMarkers';
export type {
    LottieAnimationData,
    LottieMarker,
    MarkerFrameTable,
} from './replacements/lottieMarkers';
