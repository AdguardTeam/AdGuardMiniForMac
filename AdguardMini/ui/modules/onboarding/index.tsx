// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'expose-loader?exposes=preactHooks!preact/hooks';
import lottie from 'lottie-web';
// eslint-disable-next-line import/order
import { __setLoadAnimationFactory, instantiateLogger } from '@adg/webview-utils-kit';
import { render } from 'preact';

// Import before other modules.
import 'Common/api';
import { OnboardingCallbackService } from 'Common/apis/callbacks/OnboardingCallbackService';
import { OnboardingCallbackServiceInternal } from 'Common/apis/callbacks/OnboardingCallbackServiceInternal';
import { setupOnboardingWebViewBridge } from 'Modules/onboarding/lib/webViewOnboardingBootstrap';
// Default css styles (reset, colors, dark/light)...
import 'Theme/default';

import { App } from './components/App';

const onboardingCallbackService = new OnboardingCallbackService(new OnboardingCallbackServiceInternal());
setupOnboardingWebViewBridge(onboardingCallbackService);
// Override bootstrap fallback `window.log` with real logger.
window.log = instantiateLogger(FULL_LOGS);

// Register `lottie-web` factory before UI mount.
__setLoadAnimationFactory(lottie.loadAnimation);

const node = document.getElementById('app');
if (node) {
    render(<App />, node);
}
