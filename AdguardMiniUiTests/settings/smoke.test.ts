// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Auto-generated smoke tests for the Settings module.
 *
 * Reads the page flow from test-ids.json for the settings module and
 * runs visibility checks on every declared element across 9 pages
 * (Safari Protection, Language Specific, Advanced Blocking, User Rules,
 * General, Filters, License, Support, About).
 *
 * @module SmokeTests/Settings
 */

import { runSmokeTests } from '../helpers/smoke.ts';
import { MODULES } from '../helpers/driver.ts';
import manifest from '../test-ids.json' with { type: 'json' };

runSmokeTests(MODULES.settings, manifest);
