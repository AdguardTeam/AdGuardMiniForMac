// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Codegen smoke test. Regenerates Swift + TS output from a
 * fixture `.proto` via the vendored proto-generator + asserts no
 * Sciter-specific references appear in the regenerated output (US14.1,
 * US14.2). Self-skips when the project `.venv` Python is unavailable
 * (mirrors the `RUN_BUILD=1` self-skip precedent — the smoke test is a
 * developer-invoked check, not a hard CI gate).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Path to the project `.venv` interpreter, which is the only one
 * guaranteed to carry the generator's third-party dependencies.
 */
function resolvePython(repoRoot: string): string | null {
    const venvPython = path.join(repoRoot, '.venv', 'bin', 'python3');
    try {
        execFileSync(venvPython, ['--version'], { stdio: 'ignore' });
        return venvPython;
    } catch {
        // The `.venv` interpreter is missing or not runnable.
    }
    return null;
}

/**
 * Probe whether `resolvedPython` can import the generator's dependencies
 * by running it with `--help`. The top-level `import helper` chain pulls
 * in `simplejson` and friends, so a non-zero exit means the generator
 * cannot run at all.
 */
function pythonCanRunGenerator(python: string, generator: string): boolean {
    try {
        execFileSync(python, [generator, '-h'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

const repoRoot = path.resolve(__dirname, '../../../../../..');
const generator = path.join(
    repoRoot,
    'AdguardMini/ui/packages/proto-generator/proto-parser/src/main.py',
);

// Self-skip when the project `.venv` Python cannot drive the generator
// (mirrors the RUN_BUILD=1 precedent: the smoke test is a developer-
// invoked check, not a hard CI gate). `PYTHON` is only dereferenced
// inside `describe`, which is skipped when `SKIP` is true.
const resolvedPython = resolvePython(repoRoot);
const SKIP = resolvedPython == null || !pythonCanRunGenerator(resolvedPython, generator);
const PYTHON = resolvedPython!;

void describe('codegen smoke test WKWebView-native dispatch', { skip: SKIP }, () => {
    const cfgDir = path.join(repoRoot, 'AdguardMini/ui/schema/.protocfg');
    const fixtureDir = path.join(repoRoot, 'AdguardMini/ui/tests/codegen/fixtures');

    function runCodegen(language: 'swift' | 'typescript', outDir: string): void {
        execFileSync(PYTHON, [
            generator,
            '-l', language,
            '-c', cfgDir,
            '-i', fixtureDir,
            '-o', outDir,
        ], { stdio: 'pipe' });
    }

    it('regenerated Swift service — no Sciter references and no `import SciterSwift` (US14.1)', () => {
        const outDir = mkdtempSync(path.join(tmpdir(), 'codegen-swift-'));
        runCodegen('swift', outDir);
        const serviceFile = path.join(outDir, 'services', 'SampleService.swift');
        assert.ok(existsSync(serviceFile), `Expected regenerated ${serviceFile}`);
        const content = readFileSync(serviceFile, 'utf8');
        assert.ok(
            !content.includes('SciterBridge'),
            'Regenerated Swift must not reference SciterBridge',
        );
        assert.ok(
            !content.includes('SwiftBridge'),
            'Regenerated Swift must not reference SwiftBridge',
        );
        // Check that the actual import directive is absent (not just in a comment).
        // The comment says: "no `import SciterSwift` in regenerated code" so a naive
        // substring match would false-positive. Match only lines that start with 'import SciterSwift'.
        const hasImportSciterSwift = content
            .split('\n')
            .some((line) => line.trimStart().startsWith('import SciterSwift'));
        assert.ok(!hasImportSciterSwift, 'Regenerated Swift must not import SciterSwift');
        assert.ok(
            content.includes('WebViewBridge'),
            'Regenerated Swift service must extend WebViewBridge',
        );
        assert.ok(
            content.includes('handleRequest'),
            'Regenerated Swift service must emit handleRequest',
        );
    });

    it('regenerated Swift callback — no Sciter references and no `import SciterSwift` (US14.1)', () => {
        const outDir = mkdtempSync(path.join(tmpdir(), 'codegen-swift-cb-'));
        runCodegen('swift', outDir);
        const callbackFile = path.join(outDir, 'callbacks', 'SampleCallbackService.swift');
        assert.ok(existsSync(callbackFile), `Expected regenerated ${callbackFile}`);
        const content = readFileSync(callbackFile, 'utf8');
        assert.ok(
            !content.includes('SciterBridge'),
            'Regenerated Swift callback must not reference SciterBridge',
        );
        assert.ok(
            !content.includes('SwiftBridge'),
            'Regenerated Swift callback must not reference SwiftBridge',
        );
        // Check that the actual import directive is absent (not just in a comment).
        const hasImportSciterSwift = content
            .split('\n')
            .some((line) => line.trimStart().startsWith('import SciterSwift'));
        assert.ok(!hasImportSciterSwift, 'Regenerated Swift callback must not import SciterSwift');
        assert.ok(
            content.includes('WebViewCallbackBridge'),
            'Regenerated Swift callback must extend WebViewCallbackBridge',
        );
        assert.ok(
            content.includes('dispatchCallback'),
            'Regenerated Swift callback must emit dispatchCallback dual-dispatch',
        );
    });

    it('regenerated TS request + callback — no Window.this.xcall references (US14.2)', () => {
        const outDir = mkdtempSync(path.join(tmpdir(), 'codegen-ts-'));
        runCodegen('typescript', outDir);
        // The TS codegen produces requests/ (not services/) and callbacks/.
        const requestFile = path.join(outDir, 'requests', 'SampleService', 'EchoRequest.ts');
        const callbackFile = path.join(outDir, 'callbacks', 'SampleCallbackService.ts');
        assert.ok(existsSync(requestFile), `Expected regenerated ${requestFile}`);
        assert.ok(existsSync(callbackFile), `Expected regenerated ${callbackFile}`);
        const reqContent = readFileSync(requestFile, 'utf8');
        const cbContent = readFileSync(callbackFile, 'utf8');
        assert.ok(
            !reqContent.includes('Window.this.xcall'),
            'Regenerated TS request must not reference Window.this.xcall',
        );
        assert.ok(
            !cbContent.includes('Window.this.xcall'),
            'Regenerated TS callback must not reference Window.this.xcall',
        );
    });
});
