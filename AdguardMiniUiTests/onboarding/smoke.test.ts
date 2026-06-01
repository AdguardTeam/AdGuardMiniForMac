// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Auto-generated smoke tests for the Onboarding module.
 *
 * Reads the page flow from test-ids.json for the onboarding module and
 * runs visibility checks across the 6-step wizard flow (Start → Extensions
 * → Ads → Trackers → Annoyances → Finish).
 *
 * The onboarding module is standalone — it runs in its own window and
 * does not coexist with the main app windows.
 *
 * @module SmokeTests/Onboarding
 */

import { runSmokeTests } from '../helpers/smoke.ts';
import { MODULES } from '../helpers/driver.ts';
import manifest from '../test-ids.json' with { type: 'json' };

runSmokeTests(MODULES.onboarding, manifest);
