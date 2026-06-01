// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Visual comparison helpers for screenshot regression tests.
 *
 * Provides:
 *   - compareImages()     — pixel-level diff of two PNG buffers via pixelmatch
 *   - captureAndCompare() — full flow: screenshot → save → diff → report result
 *   - updateBaseline()    — overwrite stored baseline with a new capture
 *
 * All paths are relative to the test project root (parent of helpers/).
 *
 * @module TestHelpers/Visual
 */

import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SciterDriver } from '@adg/sciter-test-driver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Base directory for all visual test artifacts (parent of helpers/).
 * Used to resolve baselines/, results/, etc.
 */
const TEST_ROOT = resolve(__dirname, '..');

/**
 * Default pixelmatch threshold (per-channel color tolerance).
 * 0.1 means ~10% color distance per channel is considered matching.
 * Pixels within this distance are treated as identical.
 */
const PIXELMATCH_THRESHOLD = 0.1;

/**
 * Maximum allowable fraction of differing pixels (1% of total).
 * If the actual diff exceeds this, the comparison is marked FAIL.
 */
const MAX_DIFF_FRACTION = 0.01;

/**
 * Result of comparing two images via compareImages().
 */
export interface CompareResult {
    /** Whether images match within the configured threshold. */
    pass: boolean;
    /** Number of pixels that differ (0 if identical). */
    diffPixels: number;
    /** Total pixels in the compared image. */
    totalPixels: number;
    /** Fraction of differing pixels (0–1). */
    diffPercent: number;
    /**
     * PNG buffer of the diff image with magenta highlights on differing
     * pixels, or null if the images matched (pass === true).
     */
    diffBuffer: Buffer | null;
    /** Warning string if dimensions were mismatched and resized. */
    warning?: string;
}

/**
 * Result of one visual test (one screenshot + comparison).
 */
export interface VisualTestResult {
    /** Module name (e.g., 'settings'). */
    module: string;
    /** Screenshot identifier (e.g., 'settings-general-page--full'). */
    screenshotName: string;
    /** Test outcome. */
    status: 'PASS' | 'FAIL' | 'NEW' | 'ERROR';
    /** Number of differing pixels. */
    diffPixels: number;
    /** Total pixels compared. */
    totalPixels: number;
    /** Fraction of differing pixels (0–1). */
    diffPercent: number;
    /** Absolute path to the baseline PNG on disk. */
    baselinePath: string;
    /** Absolute path to the captured (actual) PNG on disk. */
    actualPath: string;
    /** Absolute path to the diff PNG, or null if PASS or no comparison. */
    diffPath: string | null;
    /** Error message if status is ERROR. */
    error: string | null;
    /** Duration of capture + comparison in milliseconds. */
    durationMs: number;
}

/**
 * Describes one screenshot to capture and compare.
 */
export interface ScreenshotSpec {
    /** Unique name used in filename: `<pageId>--<name>.png`. */
    name: string;
    /** 'full' = full-page, 'element' = element-level. */
    type: 'full' | 'element';
    /** For element-level: CSS selector of the target element. Null for full-page. */
    selector: string | null;
    /** Test ID of the page container that must be visible before capture. */
    pageId: string;
    /** Optional navigation to reach this page state (click menu, eval JS). */
    navigate?: { click?: string; eval?: string };
    /** Optional JS eval to prepare state before capture (e.g., open modal). */
    setup?: string;
}

/**
 * Ensures a directory exists for a given file path.
 * Acts as mkdir -p — creates the directory and any missing parents.
 *
 * @param filePath - Path to a file whose parent directory should exist.
 */
export function ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

/**
 * Compares two PNG image buffers using pixelmatch.
 *
 * If dimensions differ, the actual image is resized to match baseline
 * dimensions and a warning is recorded.
 *
 * @param baselineBuf - PNG buffer of the baseline image.
 * @param actualBuf - PNG buffer of the actual (captured) image.
 * @returns Comparison result with diff metrics and optional diff image.
 */
export async function compareImages(
    baselineBuf: Buffer,
    actualBuf: Buffer,
): Promise<CompareResult> {
    // Decode both images to raw RGBA
    const [baseline, actual] = await Promise.all([
        sharp(baselineBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(actualBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);

    let actualData = actual.data;
    let actualInfo = actual.info;
    let warning: string | undefined;

    // If dimensions differ, resize actual to match baseline.
    // This handles cases where Sciter renders at a slightly different
    // window size than the baseline was captured at. A warning is recorded
    // so the report can flag it.
    if (actualInfo.width !== baseline.info.width || actualInfo.height !== baseline.info.height) {
        const resized = await sharp(actualBuf)
            .resize(baseline.info.width, baseline.info.height, { fit: 'fill' })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        actualData = resized.data;
        actualInfo = resized.info;
        warning = `Actual dimensions ${actualInfo.width}x${actualInfo.height} `
            + `differ from baseline ${baseline.info.width}x${baseline.info.height}; `
            + `resized to match baseline`;
    }

    const { width, height } = baseline.info;
    const totalPixels = width * height;
    const diffPixelsBuffer = new Uint8Array(totalPixels * 4);

    const diffPixels = pixelmatch(
        new Uint8Array(baseline.data),
        new Uint8Array(actualData),
        diffPixelsBuffer,
        width,
        height,
        {
            threshold: PIXELMATCH_THRESHOLD,
            includeAA: false,
            alpha: 0.5,
        },
    );

    const diffPercent = totalPixels > 0 ? diffPixels / totalPixels : 0;
    const pass = diffPercent <= MAX_DIFF_FRACTION;

    let diffBuffer: Buffer | null = null;
    if (!pass) {
        diffBuffer = await sharp(diffPixelsBuffer, {
            raw: { width, height, channels: 4 },
        }).png().toBuffer();
    }

    return { pass, diffPixels, totalPixels, diffPercent, diffBuffer, warning };
}

/**
 * Captures a screenshot and compares it against the stored baseline.
 *
 * @param driver - Connected SciterDriver instance.
 * @param spec - Screenshot specification.
 * @param moduleName - Module name (e.g., 'settings').
 * @param baselineRoot - Root directory for baselines (default: `baselines/`).
 * @returns VisualTestResult with comparison outcome.
 */
export async function captureAndCompare(
    driver: SciterDriver,
    spec: ScreenshotSpec,
    moduleName: string,
    baselineRoot: string = resolve(TEST_ROOT, 'baselines'),
): Promise<VisualTestResult> {
    const start = Date.now();
    const screenshotName = `${spec.pageId}--${spec.name}`;

    // Paths
    const baselineDir = resolve(baselineRoot, moduleName);
    const baselinePath = resolve(baselineDir, `${screenshotName}.png`);
    const actualDir = resolve(TEST_ROOT, 'results', moduleName, 'actual');
    const actualPath = resolve(actualDir, `${screenshotName}.png`);
    const diffDir = resolve(TEST_ROOT, 'results', moduleName, 'diffs');
    const diffPath = resolve(diffDir, `${screenshotName}.png`);

    try {
        // Wait for the page container to be visible before capturing.
        // This ensures the page has finished rendering (Preact reconciliation)
        // and the target element is in the DOM.
        await driver.waitForElement(`#${spec.pageId}`, { timeout: 5000 });

        // Optional setup (e.g., open modal by dispatching events).
        // The setup code is eval'd in the Sciter runtime.
        if (spec.setup) {
            await driver.eval(spec.setup);
            // Brief pause for Sciter to process the setup (render modal, etc.)
            await new Promise((r) => setTimeout(r, 300));
        }

        // Capture screenshot — either element-level or full-page.
        let screenshotBuf: Buffer;
        if (spec.type === 'element' && spec.selector) {
            const el = await driver.findElement(spec.selector);
            screenshotBuf = await el.screenshot();
        } else {
            screenshotBuf = await driver.screenshot();
        }

        // Save the actual screenshot to disk for the report.
        ensureDir(actualPath);
        writeFileSync(actualPath, screenshotBuf);

        // Check if a baseline exists for this screenshot.
        if (!existsSync(baselinePath)) {
            // No baseline yet — this is a first run. The actual screenshot
            // is saved as a candidate. The user can run with --update to
            // promote it to a baseline.
            const duration = Date.now() - start;
            return {
                module: moduleName,
                screenshotName,
                status: 'NEW',
                diffPixels: 0,
                totalPixels: 0,
                diffPercent: 0,
                baselinePath,
                actualPath,
                diffPath: null,
                error: null,
                durationMs: duration,
            };
        }

        // Compare the captured screenshot against the stored baseline.
        const baselineBuf = readFileSync(baselinePath);
        const result = await compareImages(baselineBuf, screenshotBuf);

        let savedDiffPath: string | null = null;
        if (!result.pass) {
            // Save the diff image (magenta highlights on differing pixels).
            ensureDir(diffPath);
            writeFileSync(diffPath, result.diffBuffer!);
            savedDiffPath = diffPath;
        }

        const duration = Date.now() - start;
        return {
            module: moduleName,
            screenshotName,
            status: result.pass ? 'PASS' : 'FAIL',
            diffPixels: result.diffPixels,
            totalPixels: result.totalPixels,
            diffPercent: result.diffPercent,
            baselinePath,
            actualPath,
            diffPath: savedDiffPath,
            error: result.warning || null,
            durationMs: duration,
        };
    } catch (err) {
        const duration = Date.now() - start;
        return {
            module: moduleName,
            screenshotName,
            status: 'ERROR',
            diffPixels: 0,
            totalPixels: 0,
            diffPercent: 0,
            baselinePath,
            actualPath,
            diffPath: null,
            error: err instanceof Error ? err.message : String(err),
            durationMs: duration,
        };
    }
}

/**
 * Copies the actual screenshot to the baseline directory, overwriting
 * the existing baseline. Used by `yarn test:visual:update`.
 */
export function updateBaseline(actualPath: string, baselinePath: string): void {
    ensureDir(baselinePath);
    const buf = readFileSync(actualPath);
    writeFileSync(baselinePath, buf);
}
