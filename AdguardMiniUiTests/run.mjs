// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview CLI entry point for smoke tests.
 *
 * Spawns `node --test` with smoke test file(s) for the requested module(s)
 * and generates an HTML report via helpers/reporter.mjs.
 *
 * Usage:
 *   node run.mjs                     # all modules (tray + settings)
 *   node run.mjs --module=settings   # single module
 *   node run.mjs --timeout=15000     # custom connection timeout
 *
 * @module SmokeTestRunner
 */

import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Directory of this script. */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** Project root (parent of this script), used as cwd for node --test. */
const ROOT = resolve(__dirname, '..');

/**
 * Parses CLI arguments.
 *
 * @returns {{ module: string|null, timeout: string }}
 */
function parseArgs() {
    const args = {
        module: null,
        timeout: '10000',
    };

    for (const arg of process.argv.slice(2)) {
        if (arg.startsWith('--module=')) {
            args.module = arg.split('=')[1];
        } else if (arg.startsWith('--timeout=')) {
            args.timeout = arg.split('=')[1];
        }
    }

    return args;
}

const args = parseArgs();

// --- Determine test files ---
let testFlags;
if (args.module) {
    // Run a single module.
    const valid = ['tray', 'settings', 'onboarding'];
    if (!valid.includes(args.module)) {
        console.error(`Unknown module: ${args.module}. Available: ${valid.join(', ')}`);
        process.exit(1);
    }
    testFlags = [
        '--test', resolve(__dirname, args.module, 'smoke.test.ts'),
    ];
} else {
    // Run tray and settings together.
    // Onboarding is standalone — it doesn't co-exist with the main
    // app windows and must be tested separately.
    testFlags = [
        '--test', resolve(__dirname, 'tray', 'smoke.test.ts'),
        '--test', resolve(__dirname, 'settings', 'smoke.test.ts'),
    ];
}

// --- Run tests ---
// Custom reporter generates an HTML report after the test run.
const reporter = resolve(__dirname, 'helpers', 'reporter.mjs');

const result = spawnSync('node', [
    '--experimental-strip-types',
    '--test-reporter', 'spec',
    '--test-reporter-destination', 'stdout',
    '--test-reporter', reporter,
    '--test-reporter-destination', 'stdout',
    ...testFlags,
], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, E2E_TIMEOUT: args.timeout },
});

process.exit(result.status ?? 1);
