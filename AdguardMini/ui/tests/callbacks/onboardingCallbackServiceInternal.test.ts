// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { store, __resetOnboardingTestStore } from '../mocks/onboardingStore';
import { OnboardingCallbackServiceInternal } from '../../modules/common/apis/callbacks/OnboardingCallbackServiceInternal';
import { EffectiveThemeValue, EffectiveTheme } from '../../modules/common/apis/types';

/**
 * Behavioral tests for `OnboardingCallbackServiceInternal` — the single
 * `OnboardingCallbackService.OnEffectiveThemeChanged` push's effect on the
 * onboarding store.
 */

test('OnEffectiveThemeChanged forwards the theme via setEffectiveTheme', async () => {
    __resetOnboardingTestStore();
    const received: unknown[] = [];
    store.steps = {
        setEffectiveTheme: (v: unknown) => { received.push(v); },
    };

    const service = new OnboardingCallbackServiceInternal();
    await service.OnEffectiveThemeChanged(new EffectiveThemeValue({ value: EffectiveTheme.dark }));

    assert.deepEqual(received, [EffectiveTheme.dark]);
});
