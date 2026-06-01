// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Auto-generated smoke tests for the Tray module.
 *
 * Reads the page flow from test-ids.json for the tray module and
 * runs visibility checks on every declared element. No per-test
 * code changes needed when adding new elements — just update
 * test-ids.json.
 *
 * @module SmokeTests/Tray
 */

import { runSmokeTests } from '../helpers/smoke.ts';
import { MODULES } from '../helpers/driver.ts';
import manifest from '../test-ids.json' with { type: 'json' };

runSmokeTests(MODULES.tray, manifest);
