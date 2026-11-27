// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Codegen smoke test. Regenerates Swift + TS output from a
 * fixture `.proto` via the vendored proto-generator + asserts no
 * Sciter-specific references appear in the regenerated output (US14.1,
 * US14.2). Self-skips when the project `.venv` Python is unavailable, so it
 * stays a developer-invoked check rather than a hard CI gate.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
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
 * Probe whether `resolvedPython` can run the generator by invoking it with
 * `--help`. A non-zero exit means the generator's own dependencies are
 * missing, so it cannot run at all.
 */
function pythonCanRunGenerator(python: string, generator: string): boolean {
    try {
        execFileSync(python, [generator, '-h'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

const repoRoot = path.resolve(__dirname, '../../../..');
const generator = path.join(
    repoRoot,
    'AdguardMini/ui/packages/proto-generator/proto-parser/src/main.py',
);

// Self-skip when the project `.venv` Python cannot drive the generator,
// because this is a developer-invoked check, not a hard CI gate. `PYTHON` is
// only dereferenced inside `describe`, which is skipped when `SKIP` is true.
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

    it('regenerated doc comments — service and method text comes from the proto comments', () => {
        const outDir = mkdtempSync(path.join(tmpdir(), 'codegen-docs-'));
        runCodegen('swift', outDir);
        const content = readFileSync(path.join(outDir, 'services', 'SampleService.swift'), 'utf8');
        assert.ok(
            content.includes('/// Sample service for codegen smoke test'),
            'Regenerated Swift service must carry its proto comment as the doc comment',
        );
        assert.ok(
            content.includes('/// Echo request bytes back'),
            'Regenerated Swift method must carry its proto comment as the doc comment',
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
            reqContent.includes(' * Echo request bytes back'),
            'Regenerated TS request must carry the proto comment as its JSDoc',
        );
        assert.ok(
            !cbContent.includes('Window.this.xcall'),
            'Regenerated TS callback must not reference Window.this.xcall',
        );
        assert.ok(
            cbContent.includes('window.log?.dbg('),
            'Regenerated TS callback must log through window.log?.dbg',
        );
        assert.ok(
            !cbContent.includes('log.dbg('),
            'Regenerated TS callback must not call a bare log.dbg',
        );
    });

    it('TypeScript codegen seeds callback implementations outside the generated tree', () => {
        const outDir = mkdtempSync(path.join(tmpdir(), 'codegen-ts-impl-'));
        runCodegen('typescript', outDir);
        assert.ok(
            existsSync(path.join(outDir, 'impl', 'SampleCallbackServiceInternal.ts')),
            'Expected the seeded implementation in the impl tree',
        );
        assert.ok(
            !existsSync(path.join(outDir, 'callbacks', 'SampleCallbackServiceInternal.ts')),
            'Expected no implementation file inside the generated callbacks tree',
        );
    });

    it('TypeScript codegen never overwrites an existing implementation', () => {
        const outDir = mkdtempSync(path.join(tmpdir(), 'codegen-ts-impl-keep-'));
        runCodegen('typescript', outDir);
        const implPath = path.join(outDir, 'impl', 'SampleCallbackServiceInternal.ts');
        const marker = '// implementation marker';
        writeFileSync(implPath, `${readFileSync(implPath, 'utf8')}\n${marker}\n`);
        runCodegen('typescript', outDir);
        assert.ok(
            readFileSync(implPath, 'utf8').includes(marker),
            'The generator must not overwrite an existing implementation',
        );
    });

    it('TypeScript codegen emits no callbacks index barrel', () => {
        const outDir = mkdtempSync(path.join(tmpdir(), 'codegen-ts-barrel-'));
        runCodegen('typescript', outDir);
        assert.ok(
            existsSync(path.join(outDir, 'callbacks', 'SampleCallbackService.ts')),
            'Expected the regenerated callback service to exist',
        );
        assert.ok(
            !existsSync(path.join(outDir, 'callbacks', 'index.ts')),
            'Expected no callbacks/index.ts barrel in the regenerated output',
        );
    });
});
