// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  cspPolicy.test.ts
//  AdguardMini
//

import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Modules whose page sources must carry the strict no-dynamic-code
 * policy in this slice. The `userrules` module is the PRD's named
 * dynamic-code exception and is hardened separately.
 */
const HARDENED_MODULES = ['tray', 'settings', 'onboarding'] as const;

/**
 * Directives that must be present and set to `'none'` — the
 * categorically forbidden behaviours per the PRD "Web Content Policy".
 */
const FORBIDDEN_DIRECTIVES = [
    'connect-src',
    'frame-src',
    'child-src',
    'object-src',
    'base-uri',
    'form-action',
] as const;

/**
 * Source directives that must be exactly `'self'` — bundle-only
 * scripts, styles, images, and fonts.
 */
const SELF_DIRECTIVES = [
    'default-src',
    'script-src',
    'style-src',
    'img-src',
    'font-src',
] as const;

/**
 * Tokens that grant dynamic-code execution. None of them may appear
 * anywhere in the policy of a hardened module.
 */
const DYNAMIC_CODE_TOKENS = ["'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'"];

/**
 * Parses a CSP `content` attribute value into a directive → raw-value
 * map. Each directive is `name token1 token2 ...`; only the lowercased
 * name is used as the key and the value is matched by substring on the
 * lowercased raw text so exact `'none'`/`'self'` assertions are robust
 * to source-token ordering.
 */
function parsePolicy(content: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const raw of content.split(';')) {
        const trimmed = raw.trim();
        if (trimmed.length === 0) {
            continue;
        }
        const space = trimmed.indexOf(' ');
        const name = (space === -1 ? trimmed : trimmed.slice(0, space)).toLowerCase();
        map.set(name, trimmed);
    }
    return map;
}

/**
 * Reads a module page source and returns its CSP `content` attribute.
 * Throws an assertion error if the `<meta http-equiv="Content-Security-Policy">`
 * tag is absent.
 */
function readModulePolicy(module: string): string {
    const filePath = path.join(
        process.cwd(),
        'AdguardMini',
        'ui',
        'modules',
        module,
        'index.html',
    );
    const html = fs.readFileSync(filePath, 'utf8')
        // The critical CSS and its CSP hash are inlined at build time (see
        // `webpack.config.base.js`). Expand the lodash placeholders so the
        // `<meta>` tag parses like the emitted page — the placeholder's `%>`
        // would otherwise truncate the tag in the regex below.
        .replace(/<%= criticalCss %>/g, '')
        .replace(/<%= criticalCssHash %>/g, "'sha256-hash'");
    const metaMatch = html.match(
        /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i,
    );
    assert.ok(metaMatch, `${module}/index.html: missing CSP <meta> tag`);
    // Match the content attribute value using the same quote delimiter
    // so embedded single-quotes in the policy do not break the capture.
    const contentMatch = metaMatch[0].match(/content="([^"]*)"/i)
        || metaMatch[0].match(/content='([^']*)'/i);
    assert.ok(contentMatch, `${module}/index.html: CSP <meta> has no content attribute`);
    return contentMatch[1];
}

test('each hardened module declares a Content-Security-Policy meta tag', () => {
    for (const module of HARDENED_MODULES) {
        const content = readModulePolicy(module);
        assert.ok(content.length > 0, `${module}/index.html: policy content is empty`);
    }
});

test('each hardened module forbids the categorically forbidden behaviours', () => {
    for (const module of HARDENED_MODULES) {
        const directives = parsePolicy(readModulePolicy(module));
        for (const name of FORBIDDEN_DIRECTIVES) {
            const value = directives.get(name);
            assert.ok(value, `${module}/index.html: missing ${name} directive`);
            assert.ok(
                value!.includes("'none'"),
                `${module}/index.html: ${name} must be 'none' (got: ${value})`,
            );
        }
    }
});

test('each hardened module permits only same-origin scripts, styles, images, and fonts', () => {
    for (const module of HARDENED_MODULES) {
        const directives = parsePolicy(readModulePolicy(module));
        for (const name of SELF_DIRECTIVES) {
            const value = directives.get(name);
            assert.ok(value, `${module}/index.html: missing ${name} directive`);
            assert.ok(
                value!.includes("'self'"),
                `${module}/index.html: ${name} must allow 'self' (got: ${value})`,
            );
        }
    }
});

test('no hardened module grants any dynamic-code permission', () => {
    for (const module of HARDENED_MODULES) {
        const content = readModulePolicy(module).toLowerCase();
        for (const token of DYNAMIC_CODE_TOKENS) {
            assert.ok(
                !content.includes(token.toLowerCase()),
                `${module}/index.html: policy must not grant ${token}`,
            );
        }
    }
});

/**
 * The user rules module is the PRD's named dynamic-code exception
 * (PRD Implementation Decision 3). It carries the same
 * strict policy as the hardened modules, but its `script-src` may
 * additionally grant the narrow `'wasm-unsafe-eval'` token and only
 * that token — never `'unsafe-eval'` or `'unsafe-inline'`.
 */
const USER_RULES_MODULE = 'userrules';

/**
 * Every module whose page source carries a CSP in this slice. Used for
 * the global "at most one module carries a dynamic-code clause"
 * assertion (SC-002 / Acceptance Criterion 4).
 */
const ALL_POLICY_MODULES = [...HARDENED_MODULES, USER_RULES_MODULE] as const;

/**
 * The narrow WebAssembly dynamic-code token that only the user rules
 * module may carry, and only when a WebAssembly-compilation violation
 * is observed at runtime. Every other token (`'unsafe-eval'`,
 * `'unsafe-inline'`) is forbidden in every module including user rules.
 */
const PERMITTED_WASM_TOKEN = "'wasm-unsafe-eval'";

/**
 * Returns the lowercased CSP `content` for a module, or an empty
 * string when the module declares no CSP meta tag (so the global
 * "at most one module" assertion can iterate every module without
 * aborting on a missing policy).
 */
function readModulePolicyOrEmpty(module: string): string {
    try {
        return readModulePolicy(module);
    } catch {
        return '';
    }
}

/**
 * Returns the dynamic-code tokens actually present in a policy's raw
 * text, lowercased for case-insensitive matching.
 */
function presentDynamicCodeTokens(content: string): string[] {
    return DYNAMIC_CODE_TOKENS.filter((token) => content.toLowerCase().includes(token.toLowerCase()));
}

test('the user rules module declares a Content-Security-Policy meta tag', () => {
    const content = readModulePolicy(USER_RULES_MODULE);
    assert.ok(content.length > 0, `${USER_RULES_MODULE}/index.html: policy content is empty`);
});

test('the user rules module forbids the categorically forbidden behaviours', () => {
    const directives = parsePolicy(readModulePolicy(USER_RULES_MODULE));
    for (const name of FORBIDDEN_DIRECTIVES) {
        const value = directives.get(name);
        assert.ok(value, `${USER_RULES_MODULE}/index.html: missing ${name} directive`);
        assert.ok(
            value!.includes("'none'"),
            `${USER_RULES_MODULE}/index.html: ${name} must be 'none' (got: ${value})`,
        );
    }
});

test('the user rules module permits only same-origin scripts, styles, images, and fonts', () => {
    const directives = parsePolicy(readModulePolicy(USER_RULES_MODULE));
    for (const name of SELF_DIRECTIVES) {
        const value = directives.get(name);
        assert.ok(value, `${USER_RULES_MODULE}/index.html: missing ${name} directive`);
        assert.ok(
            value!.includes("'self'"),
            `${USER_RULES_MODULE}/index.html: ${name} must allow 'self' (got: ${value})`,
        );
    }
});

test('the user rules module never grants unsafe-eval or unsafe-inline', () => {
    const content = readModulePolicy(USER_RULES_MODULE).toLowerCase();
    assert.ok(
        !content.includes("'unsafe-eval'".toLowerCase()),
        `${USER_RULES_MODULE}/index.html: policy must not grant 'unsafe-eval'`,
    );
    assert.ok(
        !content.includes("'unsafe-inline'".toLowerCase()),
        `${USER_RULES_MODULE}/index.html: policy must not grant 'unsafe-inline'`,
    );
});

test('the user rules module carries at most the narrow wasm-unsafe-eval dynamic-code clause', () => {
    const tokens = presentDynamicCodeTokens(readModulePolicy(USER_RULES_MODULE));
    for (const token of tokens) {
        assert.equal(
            token.toLowerCase(),
            PERMITTED_WASM_TOKEN.toLowerCase(),
            `${USER_RULES_MODULE}/index.html: only '${PERMITTED_WASM_TOKEN}' is permitted, found ${token}`,
        );
    }
});

test('at most one module carries any dynamic-code clause and it is only wasm-unsafe-eval in user rules (SC-002)', () => {
    let modulesWithDynamicCode = 0;
    for (const module of ALL_POLICY_MODULES) {
        const tokens = presentDynamicCodeTokens(readModulePolicyOrEmpty(module));
        if (tokens.length === 0) {
            continue;
        }
        modulesWithDynamicCode += 1;
        assert.equal(
            module,
            USER_RULES_MODULE,
            `${module}/index.html: only the user rules module may carry a dynamic-code clause`,
        );
        for (const token of tokens) {
            assert.equal(
                token.toLowerCase(),
                PERMITTED_WASM_TOKEN.toLowerCase(),
                `${module}/index.html: dynamic-code clause must be only '${PERMITTED_WASM_TOKEN}', found ${token}`,
            );
        }
    }
    assert.ok(
        modulesWithDynamicCode <= 1,
        `at most one module may carry a dynamic-code clause; found ${modulesWithDynamicCode}`,
    );
});
