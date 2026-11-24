// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postcssMixins from 'postcss-mixins';
import postcssNested from 'postcss-nested';
import ts from 'typescript';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Escapes a string for embedding into a RegExp literal.
 * @param str - The string to escape.
 * @returns The escaped string.
 */
function escapeRegExp(str) {
    return str.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Reads `compilerOptions.paths` from a tsconfig through the TypeScript API.
 * @param basePath - Directory the tsconfig file lives in.
 * @param tsconfigFilename - Name of the tsconfig file to load.
 * @returns Mapping of tsconfig path keys to absolute target paths.
 */
function loadAliases(basePath, tsconfigFilename) {
    const pathToTsConfig = path.resolve(basePath, tsconfigFilename);
    const rawTsconfig = ts.readConfigFile(pathToTsConfig, ts.sys.readFile);

    if (rawTsconfig.error) {
        throw new Error(
            `Cannot read tsconfig file: ${pathToTsConfig}. Got error: ${ts.flattenDiagnosticMessageText(rawTsconfig.error.messageText, '\n')}`,
        );
    }

    const tsconfig = ts.parseJsonConfigFileContent(rawTsconfig.config, ts.sys, basePath);

    if (tsconfig.errors.length) {
        throw new Error(
            `Cannot parse tsconfig file: ${pathToTsConfig}. Got errors: ${tsconfig.errors
                .map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n'))
                .join(', ')}`,
        );
    }

    const aliases = {};
    const baseUrl = tsconfig.options.baseUrl ?? basePath;

    if (tsconfig.options.paths) {
        Object.entries(tsconfig.options.paths).forEach(([key, targets]) => {
            if (targets.length > 1) {
                throw new Error(
                    `tsconfig path "${key}" has ${targets.length} targets; a Vite alias supports only one`,
                );
            }

            const [value] = targets;
            if (value) {
                aliases[key] = path.resolve(baseUrl, value);
            }
        });
    }

    return aliases;
}

/**
 * Converts `compilerOptions.paths` into Vitest aliases, `*` keys included.
 * @returns Vitest alias entries mapping the tsconfig path prefixes to absolute targets.
 */
function pathsToAliases() {
    const aliases = loadAliases(rootDir, 'tsconfig.json');
    const entries = [];

    for (const [fromPath, target] of Object.entries(aliases)) {
        const segments = fromPath.split('*');

        if (segments.length === 1) {
            entries.push({
                find: new RegExp(`^${escapeRegExp(fromPath)}$`),
                replacement: target,
            });
        } else if (segments.length === 2) {
            entries.push({
                find: new RegExp(`^${escapeRegExp(segments[0])}(.*)${escapeRegExp(segments[1])}$`),
                replacement: target.replace(/\*/g, '$1'),
            });
        }
    }

    return entries;
}

/**
 * Test-only module substitutions; must precede `pathsToAliases()` so the mocks
 * win over the real targets.
 * @returns Vitest alias entries for the mock modules.
 */
function testMockAliases() {
    const mocksPath = 'AdguardMini/ui/tests/mocks';
    const exact = {
        'SettingsStore/modules/SettingsRouter': 'AdguardMini/ui/modules/settings/store/modules/SettingsRouter',
        Theme: `${mocksPath}/theme`,
        UILib: `${mocksPath}/uiLib`,
        Intl: `${mocksPath}/intl`,
        '@adg/webview-utils-kit': `${mocksPath}/webview-utils-kit`,
        SettingsStore: `${mocksPath}/settingsStore`,
        OnboardingStore: `${mocksPath}/onboardingStore`,
        TrayStore: `${mocksPath}/trayStore`,
    };
    const wildcard = {
        'SettingsStore/*': `${mocksPath}/settingsStore/*`,
        'SettingsLib/*': `${mocksPath}/settingsLib/*`,
    };

    const entries = Object.entries(exact).map(([from, to]) => ({
        find: new RegExp(`^${escapeRegExp(from)}$`),
        replacement: path.resolve(rootDir, to),
    }));

    for (const [from, to] of Object.entries(wildcard)) {
        const [prefix, suffix] = from.split('*');
        entries.push({
            find: new RegExp(`^${escapeRegExp(prefix)}(.*)${escapeRegExp(suffix)}$`),
            replacement: path.resolve(rootDir, to).replace(/\*/g, '$1'),
        });
    }

    return entries;
}

/**
 * Pins the Preact chain to ESM: `mobx-react-lite` picks its CommonJS build,
 * which would load a second Preact instance; `react`/`react-dom` map to
 * `preact/compat`, exactly as the production bundle aliases them.
 * @returns Vitest alias entries for Preact, `react` and `mobx-react-lite`.
 */
function esmPreactAliases() {
    const modulePath = (id) => path.resolve(rootDir, 'node_modules', id);

    return [
        { find: /^mobx-react-lite$/, replacement: modulePath('mobx-react-lite/es/index.js') },
        { find: /^preact$/, replacement: modulePath('preact/dist/preact.mjs') },
        { find: /^preact\/hooks$/, replacement: modulePath('preact/hooks/dist/hooks.mjs') },
        { find: /^preact\/compat$/, replacement: modulePath('preact/compat/dist/compat.mjs') },
        { find: /^react$/, replacement: modulePath('preact/compat/dist/compat.mjs') },
        { find: /^react-dom$/, replacement: modulePath('preact/compat/dist/compat.mjs') },
    ];
}

/**
 * Project PostCSS pipeline, mirroring `esbuild.config.base.js`: mixins first,
 * then nesting, which produces the `Text_control`-style class names.
 */
const postcssPlugins = [
    postcssMixins({
        mixinsFiles: [
            path.resolve(
                rootDir,
                'AdguardMini/ui/modules/common/theme/default/mixins.css',
            ),
        ],
    }),
    postcssNested,
];

export default defineConfig({
    css: {
        postcss: { plugins: postcssPlugins },
    },
    resolve: {
        alias: [
            ...testMockAliases(),
            ...esmPreactAliases(),
            ...pathsToAliases(),
        ],
    },
    // Vite 8 transforms with oxc and ignores `jsxImportSource` for `tests/`,
    // which would emit React JSX imports for test files.
    oxc: {
        jsx: {
            runtime: 'automatic',
            importSource: 'preact',
        },
    },
    test: {
        environment: 'jsdom',
        // Mirrors the module page markup (`modules/*/index.html`), so code that
        // looks up a mount point at module scope finds it.
        environmentOptions: {
            jsdom: {
                html: '<!DOCTYPE html><html><body><div id="app"></div><div id="notify"></div><div id="tooltip"></div></body></html>',
            },
        },
        include: ['AdguardMini/ui/tests/**/*.test.{ts,tsx}'],
        setupFiles: ['./vitest.setup.mjs'],
        // `non-scoped` returns the authored class name (`Text_control`), which
        // is what the assertions read; the production hash is irrelevant here.
        css: {
            include: [/\.p?css$/],
            modules: { classNameStrategy: 'non-scoped' },
        },
        coverage: {
            provider: 'v8',
            reporter: ['text-summary'],
            include: [
                'AdguardMini/ui/modules/**/*.{ts,tsx}',
                'AdguardMini/ui/packages/webview-utils-kit/src/**/*.{ts,tsx}',
            ],
            // Generated protobuf code and barrels say nothing about the logic
            // the tests cover, so they stay out of the measured set.
            exclude: [
                '**/*.d.ts',
                '**/index.ts',
                'AdguardMini/ui/modules/common/apis/types/**',
                'AdguardMini/ui/modules/common/apis/requests/**',
                'AdguardMini/ui/modules/common/apis/callbacks/**',
                'AdguardMini/ui/modules/common/webViewBootstrap.ts',
            ],
            // Ratchet, not a goal: the values sit a point below the measured
            // numbers (coverage varies slightly between runs) and move up when
            // coverage improves, never down to unblock a change.
            thresholds: {
                statements: 25,
                branches: 19,
                functions: 25,
                lines: 25,
                'AdguardMini/ui/modules/common/lib/**': {
                    statements: 71,
                    branches: 70,
                    functions: 74,
                    lines: 72,
                },
            },
        },
        clearMocks: true,
        restoreMocks: true,
    },
});
