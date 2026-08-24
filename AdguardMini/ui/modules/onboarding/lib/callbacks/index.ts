// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { OnboardingCallbackService } from 'Common/apis/callbacks/OnboardingCallbackService';
import { OnboardingCallbackServiceInternal } from 'Common/apis/callbacks/OnboardingCallbackServiceInternal';

import type { IOnboardingCallbackService, IOnboardingCallbackServiceInternal } from 'Common/apis/callbacks/OnboardingCallbackService';

/**
 * Proto callbacks for Onboarding module;
 */
export class API_CALLBACK {
    public OnboardingCallbackService: IOnboardingCallbackService;

    /**
     *
     */
    constructor(
        onboardingCallbackService: IOnboardingCallbackServiceInternal,
    ) {
        this.OnboardingCallbackService = new OnboardingCallbackService(onboardingCallbackService);
    }
}

declare global {
    interface Window {
        // @ts-ignore
        API_CALLBACK: API_CALLBACK;
    }
}

// @ts-ignore
window.API_CALLBACK = new API_CALLBACK(
    new OnboardingCallbackServiceInternal(),
);
