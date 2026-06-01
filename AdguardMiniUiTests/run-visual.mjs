// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview CLI entry point for visual regression tests.
 *
 * Spawns `node --test` with the visual test file(s) for the requested
 * module, then generates an HTML report from the captured screenshots.
 *
 * Usage:
 *   node run-visual.mjs --module=settings --timeout=30000
 *   node run-visual.mjs --module=settings --update
 *
 * @module VisualTestRunner
 */

import { spawnSync, execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';

/** Directory of this script. */
const __dirname = dirname(fileURLToPath(import.meta.url));
/**
 * Root of the test project (parent of this script).
 * Used as cwd when spawning node --test so that module resolution works.
 */
const ROOT = resolve(__dirname, '..');

/**
 * Parses CLI arguments into a config object.
 *
 * @returns {{ module: string, timeout: string, update: boolean, noBuild: boolean }}
 */
function parseArgs() {
    const args = {
        module: 'settings',
        timeout: '15000',
        update: false,
        noBuild: false,
    };

    for (const arg of process.argv.slice(2)) {
        if (arg.startsWith('--module=')) args.module = arg.split('=')[1];
        else if (arg.startsWith('--timeout=')) args.timeout = arg.split('=')[1];
        else if (arg === '--update') args.update = true;
    }

    return args;
}

const args = parseArgs();

// --- Validate module ---
const validModules = ['settings', 'tray', 'onboarding'];
if (!validModules.includes(args.module)) {
    console.error(`Unknown module: ${args.module}. Available: ${validModules.join(', ')}`);
    process.exit(1);
}


// --- Determine test files ---
const visualDir = resolve(__dirname, args.module, 'visual');
const testFiles = [];

// Prefer the combined all.test.ts (shared driver connection).
// The test peer only allows one TCP client at a time, so all tests for
// one module must share a single connection. Separate files would each
// try to connect independently and fail.
const combinedFile = resolve(visualDir, 'all.test.ts');
if (existsSync(combinedFile)) {
    testFiles.push('--test', combinedFile);
} else {
    // Fall back to individual files for backward compatibility.
    if (existsSync(resolve(visualDir, 'pages.test.ts'))) {
        testFiles.push('--test', resolve(visualDir, 'pages.test.ts'));
    }
    if (existsSync(resolve(visualDir, 'components.test.ts'))) {
        testFiles.push('--test', resolve(visualDir, 'components.test.ts'));
    }
}

if (testFiles.length === 0) {
    console.error(`No visual test files found in ${visualDir}`);
    process.exit(1);
}

// --- Run tests ---
// Pass E2E_TIMEOUT to the test process so getTimeoutMs() reads it.
const env = { ...process.env, E2E_TIMEOUT: args.timeout };

const startTime = Date.now();

/**
 * Spawn a single node --test process.
 * All test suites for one module run inside this one process to share
 * the single TCP connection to the Sciter test peer.
 */
const result = spawnSync('node', [
    '--experimental-strip-types',
    ...testFiles,
], {
    cwd: ROOT,
    stdio: 'inherit',
    env,
    // Hard cap: if tests hang for 2 minutes, kill the process.
    timeout: 120_000,
});

const totalDuration = Date.now() - startTime;

// --- Generate HTML report ---
const { generateVisualReport } = await import('./helpers/visual-reporter.mjs');

// Scan results directory for actual/baseline/diff files to build
// the report data. The test files save screenshots to:
//   results/<module>/actual/<screenshotName>.png
//   results/<module>/diffs/<screenshotName>.png  (only on mismatch)
const resultsDir = resolve(__dirname, 'results', args.module);
const baselineDir = resolve(__dirname, 'baselines', args.module);

const results = [];
if (existsSync(resultsDir)) {
    const actualDir = resolve(resultsDir, 'actual');
    const diffDir = resolve(resultsDir, 'diffs');

    if (existsSync(actualDir)) {
        const { readdirSync } = await import('node:fs');
        const files = readdirSync(actualDir).filter((f) => f.endsWith('.png'));
        for (const file of files) {
            const screenshotName = file.replace(/\.png$/, '');
            const actualPath = resolve(actualDir, file);
            const baselinePath = resolve(baselineDir, file);
            const diffPath = resolve(diffDir, file);

            const baselineExists = existsSync(baselinePath);
            const diffExists = existsSync(diffPath);

            // Derive status from what files exist on disk.
            // The actual test logic in captureAndCompare produces richer
            // status values; this is a post-hoc reconstruction for the report.
            let status = 'ERROR';
            if (!baselineExists) {
                status = 'NEW';
            } else if (diffExists) {
                status = 'FAIL';
            } else {
                status = 'PASS';
            }

            results.push({
                module: args.module,
                screenshotName,
                status,
                diffPixels: 0,
                totalPixels: 0,
                diffPercent: 0,
                baselinePath,
                actualPath,
                diffPath: diffExists ? diffPath : null,
                error: null,
                durationMs: 0,
            });
        }
    }
}

generateVisualReport(results, totalDuration);

// --- Update baselines if --update flag ---
// This re-captures all screenshots and overwrites the stored baselines.
// Run `yarn test:visual` afterwards to verify the new baselines pass.
if (args.update) {
    console.log('\nUpdating baselines...');
    const actualDir = resolve(resultsDir, 'actual');
    if (existsSync(actualDir)) {
        const { readdirSync } = await import('node:fs');
        const files = readdirSync(actualDir).filter((f) => f.endsWith('.png'));
        let count = 0;
        for (const file of files) {
            const actualPath = resolve(actualDir, file);
            const baselinePath = resolve(baselineDir, file);
            mkdirSync(baselineDir, { recursive: true });
            copyFileSync(actualPath, baselinePath);
            count++;
        }
        console.log(`Updated ${count} baseline images in ${baselineDir}`);
    }
}

// Exit with the test process's exit code so the caller knows if any
// tests failed (non-zero exit).
process.exit(result.status ?? 1);
