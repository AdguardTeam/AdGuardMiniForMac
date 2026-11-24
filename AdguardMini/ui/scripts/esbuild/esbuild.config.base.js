// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

const crypto = require('crypto');
const path = require('path');
const fs = require('fs-extra');
const esbuild = require('esbuild');
const postcssMixins = require('postcss-mixins');
const postcssNested = require('postcss-nested');
const { htmlPlugin } = require('@adg/sciter-infra-utils/configs/esbuild/htmlPlugin');
const stylePlugin = require('@adg/sciter-infra-utils/configs/esbuild/stylePlugin');
const tsconfig = require('../../../../tsconfig.json');

// WebUI modules emitted as separate bundles; the Swift host loads each
// module page by its fixed `<module>.html` name.
const MODULES = ['tray', 'settings', 'onboarding', 'userrules'];

// Paths
const rootPath = path.resolve(__dirname, '..', '..', '..', '..');
const buildPath = path.join(rootPath, 'AdguardMini', 'MiniResources', 'WebUI');
const sourcePath = path.join(rootPath, 'AdguardMini', 'ui');
const commonPath = path.join(sourcePath, 'modules', 'common');
const lottiePath = path.join(sourcePath, 'modules', 'lottie');
const injectLibsPath = 'AdguardMini/ui/scripts/esbuild/inject/injectLibs.js';
const injectPreactHooksPath = 'AdguardMini/ui/scripts/esbuild/inject/injectPreactHooks.js';
const INJECTS = [injectLibsPath, injectPreactHooksPath];

// Critical CSS is inlined into every page so the first paint is themed before
// the async theme RPC resolves; the module CSP allows it through a hash.
const criticalCssPath = path.join(commonPath, 'theme', 'default', 'critical.css');
const criticalCss = fs.readFileSync(criticalCssPath, 'utf8');
const criticalCssHash = `'sha256-${crypto.createHash('sha256').update(criticalCss).digest('base64')}'`;

/**
 * Builds the esbuild alias map from `tsconfig.json` paths; `react`/`react-dom`
 * map to `preact/compat` because third-party packages import React.
 * @returns {Record<string, string>} Alias map for esbuild.
 */
function buildAliases() {
    const defaultAliases = {
        react: 'preact/compat',
        'react-dom': 'preact/compat',
    };

    return Object.keys(tsconfig.compilerOptions.paths).reduce((aliases, key) => {
        const paths = tsconfig.compilerOptions.paths[key].map((p) => p.replace('/*', ''));
        aliases[key.replace('/*', '')] = path.resolve(
            rootPath,
            tsconfig.compilerOptions.baseUrl,
            ...paths,
        );

        return aliases;
    }, defaultAliases);
}

/**
 * Empties the output directory so removed modules never linger in the bundle.
 */
async function cleanBuildDirectory() {
    await fs.emptyDir(buildPath);
}

/**
 * Copies the runtime assets that are not imported as modules.
 */
async function copyFiles() {
    await fs.copy(path.join(rootPath, '.twosky.json'), path.join(buildPath, '.twosky.json'));
    await fs.copy(lottiePath, buildPath, { overwrite: true });
}

/**
 * Creates a style plugin with the project PostCSS pipeline: mixins first, then
 * nesting, since a mixin body may itself contain nested selectors.
 * @returns {object} esbuild plugin.
 */
function createStylePlugin() {
    return stylePlugin({
        cssModulesOptions: {
            generateScopedName: '[local]-[hash:base64:5]',
        },
        postcss: {
            plugins: [
                postcssMixins({
                    mixinsFiles: [path.join(commonPath, 'theme', 'default', 'mixins.css')],
                }),
                postcssNested,
            ],
        },
    });
}

/**
 * Creates the HTML plugin configuration for all module pages.
 *
 * @returns {object} esbuild plugin.
 */
function createHtmlPlugin() {
    return htmlPlugin({
        files: MODULES.map((moduleName) => ({
            entryPoints: [`AdguardMini/ui/modules/${moduleName}/index.tsx`],
            filename: `${moduleName}.html`,
            htmlTemplate: path.join(sourcePath, 'modules', moduleName, 'index.html'),
            scriptLoading: 'defer',
            define: {
                criticalCss,
                criticalCssHash,
            },
        })),
    });
}

// Prefix of an inject export that replaces a global helper: `__miniFoo` exports
// the `foo` helper, so the two names cannot drift apart.
const INJECT_HELPER_PREFIX = '__mini';

/**
 * Reads the export names of the inject module without bundling anything.
 *
 * @returns {Promise<string[]>} Exported names.
 */
async function readInjectExports() {
    const { metafile } = await esbuild.build({
        absWorkingDir: rootPath,
        entryPoints: INJECTS,
        outdir: path.join(buildPath, '.inject-exports-check'),
        format: 'esm',
        bundle: false,
        write: false,
        metafile: true,
        logLevel: 'silent',
    });

    return Object.values(metafile.outputs).flatMap((output) => output.exports ?? []);
}

/**
 * Builds the `define` map from the inject module exports.
 *
 * @param {string[]} exportNames - Exports of the inject module.
 * @returns {Record<string, string>} Define map for esbuild.
 */
function createInjectDefines(exportNames) {
    return Object.fromEntries(
        exportNames
            .filter((name) => name?.startsWith(INJECT_HELPER_PREFIX))
            .map((name) => {
                const helper = name.slice(INJECT_HELPER_PREFIX.length);
                return [helper.charAt(0).toLowerCase() + helper.slice(1), name];
            }),
    );
}

/**
 * Creates the shared esbuild configuration for the WKWebView bundle. The pages
 * load from `file://`, where WebKit rejects ES modules, hence an `iife`.
 * @returns {Promise<object>} esbuild configuration shared by dev and prod.
 */
module.exports = async function createBaseConfig() {
    await cleanBuildDirectory();
    await copyFiles();

    return {
        absWorkingDir: rootPath,
        // Object form so `[name]` is the module name, not the file name
        // (`index` for every module).
        entryPoints: Object.fromEntries(
            MODULES.map((moduleName) => [
                moduleName,
                `AdguardMini/ui/modules/${moduleName}/index.tsx`,
            ]),
        ),
        outdir: buildPath,
        entryNames: '[name].app',
        bundle: true,
        format: 'iife',
        splitting: false,
        platform: 'browser',
        resolveExtensions: ['.ts', '.tsx', '.js'],
        alias: buildAliases(),
        inject: INJECTS,
        define: createInjectDefines(await readInjectExports()),
        // Localized strings are UTF-8; without this esbuild escapes every
        // non-ASCII character, which roughly doubles the locale payload.
        charset: 'utf8',
        // Content-hash naming: identical assets collapse into one file with an
        // opaque name, and the original extension is preserved.
        assetNames: 'assets/[hash]',
        loader: {
            '.ts': 'ts',
            '.tsx': 'tsx',
            '.css': 'css',
            '.pcss': 'css',
            '.html': 'text',
            '.png': 'file',
            '.jpg': 'file',
            '.jpeg': 'file',
            '.gif': 'file',
            '.svg': 'file',
            '.mp4': 'file',
            '.webm': 'file',
            '.wmv': 'file',
            '.woff': 'file',
            '.woff2': 'file',
            '.ttf': 'file',
            '.otf': 'file',
            '.eot': 'file',
            // Inlined as a data URL: the userrules CSP forbids a separate
            // `.wasm` fetch, so the Oniguruma payload ships inside the bundle.
            '.wasm': 'dataurl',
        },
        plugins: [createStylePlugin(), createHtmlPlugin()],
    };
};

module.exports.MODULES = MODULES;
