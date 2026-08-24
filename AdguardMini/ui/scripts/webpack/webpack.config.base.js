// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const fs = require('fs');
const crypto = require('crypto');
// DIST_PATH is the relative path (from AdguardMini/) where webpack emits
// the per-module HTML/JS/CSS bundle directly into the source-tree resource
// directory that the "Build And Copy Addition Resources Script" build phase
// (AdguardMini/Scripts/buildResourcesPhase.sh) rsyncs into the app bundle;
// the WKWebView host then loads each module via
// Bundle.main.url(forResource:withExtension:). Webpack's `output.clean: true`
// wipes this directory on every build, replacing the deleted mirrorWebUI.sh
// rsync step, so emitting here is a single-stage pipeline. Both this output
// and the former ./build are gitignored (see .gitignore).
const DIST_PATH = './MiniResources/WebUI';

const MINIFIED_JS_FILE = 'app.js';

const tsconfig = require('../../../../tsconfig.json');

// Paths
const rootPath = path.resolve(__dirname, '..', '..', '..', '..');
const buildPath = path.resolve(rootPath, 'AdguardMini', DIST_PATH);
const sourcePath = path.join(rootPath, 'AdguardMini/ui');
const nodeModulesPath = path.join(rootPath, 'node_modules');
const commonPath = path.join(sourcePath, 'modules', 'common');
const trayPath = path.join(sourcePath, 'modules', 'tray');
const animationPath = path.join(sourcePath, 'modules', 'lottie');
const settingsPath = path.join(sourcePath, 'modules', 'settings');
const onboardingPath = path.join(sourcePath, 'modules', 'onboarding');
const userrulesPath = path.join(sourcePath, 'modules', 'userrules');

// Critical CSS is inlined into every module's `index.html` (not bundled into
// `style.*.css`) so the page background and loader colors apply on the first
// paint, before the per-module stylesheet and the async theme RPC resolve.
// The module CSP (`style-src 'self'`) allows the inline `<style>` via a
// content hash computed here from the exact bytes that are inlined, so
// editing the file can never silently break the policy.
const criticalCssPath = path.join(commonPath, 'theme', 'default', 'critical.css');
const criticalCss = fs.readFileSync(criticalCssPath, 'utf8');
const criticalCssHash = `'sha256-${crypto.createHash('sha256').update(criticalCss).digest('base64')}'`;

// Chunks name
const TRAY = 'tray';
const SETTINGS = 'settings'
const ONBOARDING = 'onboarding'
const USERRULES = 'userrules'

/**
 * Get postcss setup
 *
 * @returns {{loader: string, options: {postcssOptions: {plugins: ([string,{}]|[((function({}=): Plugin | Processor)|{postcss?: boolean}),{enabled}])[]}}}}
 */
const getPostcssLoader = () => ({
    loader: 'postcss-loader',
    options: {
        postcssOptions: {
            plugins: [
                ['postcss-nested', {}],
            ],
        },
    },
});

/**
 * Build resolve.alias object
 */
function buildAliases() {
    const defaultAliases = {
        "react": "preact/compat",
        "react-dom": "preact/compat"
    };

    return Object.keys(tsconfig.compilerOptions.paths).reduce((aliases, key) => {
        // Reduce to load aliases from ./tsconfig.json in appropriate for webpack form
        const paths = tsconfig.compilerOptions.paths[key].map(p => p.replace('/*', ''));
        aliases[key.replace('/*', '')] = path.resolve(
            rootPath,
            tsconfig.compilerOptions.baseUrl,
            ...paths,
        );

        return aliases;
    }, defaultAliases);
}

module.exports = () => ({
    mode: "development",
    devtool: 'source-map',
    entry: {
        [TRAY]: path.join(trayPath, 'index.tsx'),
        [SETTINGS]: path.join(settingsPath, 'index.tsx'),
        [ONBOARDING]: path.join(onboardingPath, 'index.tsx'),
        [USERRULES]: path.join(userrulesPath, 'index.tsx'),
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: buildAliases(),
        fallback: {}
    },
    output: {
        path: buildPath,
        filename: `[name].${MINIFIED_JS_FILE}`,
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: (resource) => {
                    return (resource.indexOf('.css')+1 || resource.indexOf('.pcss')+1)
                        && !(resource.indexOf('.module.')+1);
                },
                use: [{
                    loader: MiniCssExtractPlugin.loader,
                }, 'css-loader', getPostcssLoader()],
                // Do NOT exclude `node_modules` here: the `userrules` module
                // imports `@adguard/rules-editor` which ships precompiled CSS
                // (`dist/codemirror.css`) that needs to be extracted into the
                // per-module `style.userrules.css` bundle.
            },
            {
                test: /\.module\.p?css$/,
                use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                modules: {
                                    localIdentName: "[local]-[hash:base64:5]",
                                },
                            },
                        },
                        getPostcssLoader(),
                ],
                exclude: /node_modules/,
            },
            {
                test:/\.(png|jpe?g|gif|svg|mp4|webm|wmv)$/,
                exclude: /(node_modules)/,
                use:[{
                    loader:'file-loader',
                    options:{
                        outputPath:'./images',
                    }
                }]
            },
            {
                // The `userrules` module imports `@adguard/rules-editor`, which
                // ships a WebAssembly file (`dist/onigasm.wasm`) for its syntax
                // highlighter. Inline the WASM as a base64 data URL so the
                // WKWebView host can load it with the rest of the userrules
                // bundle.
                test: /\.wasm$/,
                type: 'asset/inline'
            },
            {
                test: /^((?!index).)*\.html$/i,
                exclude: /(node_modules)/,
                loader: "html-loader",
            },
        ]
    },
    optimization: {
        emitOnErrors: true,
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'style.[name].css'
        }),
        new HtmlWebpackPlugin({
            template: path.join(trayPath, 'index.html'),
            filename: `${TRAY}.html`,
            chunks: [TRAY],
            inject: 'body',
            // HTML minification would rewrite the inline critical `<style>`
            // bytes and silently invalidate its CSP content hash, so the
            // module pages are never minified (they are small local files).
            minify: false,
            templateParameters: {
                criticalCss,
                criticalCssHash,
            },
        }),
        new HtmlWebpackPlugin({
            template: path.join(settingsPath, 'index.html'),
            filename: `${SETTINGS}.html`,
            chunks: [SETTINGS],
            inject: 'body',
            // HTML minification would rewrite the inline critical `<style>`
            // bytes and silently invalidate its CSP content hash, so the
            // module pages are never minified (they are small local files).
            minify: false,
            templateParameters: {
                criticalCss,
                criticalCssHash,
            },
        }),
        new HtmlWebpackPlugin({
            template: path.join(onboardingPath, 'index.html'),
            filename: `${ONBOARDING}.html`,
            chunks: [ONBOARDING],
            inject: 'body',
            // HTML minification would rewrite the inline critical `<style>`
            // bytes and silently invalidate its CSP content hash, so the
            // module pages are never minified (they are small local files).
            minify: false,
            templateParameters: {
                criticalCss,
                criticalCssHash,
            },
        }),
        new HtmlWebpackPlugin({
            template: path.join(userrulesPath, 'index.html'),
            filename: `${USERRULES}.html`,
            chunks: [USERRULES],
            inject: 'body',
            // HTML minification would rewrite the inline critical `<style>`
            // bytes and silently invalidate its CSP content hash, so the
            // module pages are never minified (they are small local files).
            minify: false,
            templateParameters: {
                criticalCss,
                criticalCssHash,
            },
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(rootPath, '.twosky.json'),
                    to: buildPath
                },
                // The WKWebView bootstrap (`webViewBootstrap.ts`) is NOT copied
                // as a standalone script: the per-module bootstraps
                // (`webViewTrayBootstrap`/`webViewSettingsBootstrap`/...)
                // import and bundle it via webpack, so a raw-TS copy here would
                // ship an unusable artifact into WebUI (and nothing consumes it).
                {
                    from: animationPath,
                    to: buildPath
                }
            ]
        }),
        new webpack.ProvidePlugin({
            'translate': [path.join(commonPath, 'intl', 'index.ts'), 'default'],
            'aria': [path.join(sourcePath, 'lib', 'utils', 'aria.ts'), 'aria'],
            'tx': [path.join(commonPath, 'theme', 'index.ts'), 'default'],
            'cx': [path.join(nodeModulesPath, 'classix', 'dist', 'esm', 'classix.mjs'), 'default']
        })
    ],
});
