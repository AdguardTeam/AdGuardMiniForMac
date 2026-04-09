// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const { FRONTEND_DIST_PATH: distPath } = require('@adg/sciter-infra-utils/consts/common');
const postcssSciterPlugin = require('@adg/sciter-infra-utils/lib/web/postcss-plugins/sciter');

const MINIFIED_JS_FILE = `app.js`;

const tsconfig = require('../../../../tsconfig.json');

// Paths
const rootPath = path.resolve(__dirname, '..', '..', '..', '..');
const buildPath = path.resolve(rootPath, 'AdguardMini', distPath);
const sourcePath = path.join(rootPath, 'AdguardMini/sciter-ui');
const nodeModulesPath = path.join(rootPath, 'node_modules');
const webviewPath = path.join(sourcePath, 'modules', 'webview', 'webview.html');
const commonPath = path.join(sourcePath, 'modules', 'common');
const trayPath = path.join(sourcePath, 'modules', 'tray');
const animationPath = path.join(sourcePath, 'modules', 'lottie');
const settingsPath = path.join(sourcePath, 'modules', 'settings');
const onboardingPath = path.join(sourcePath, 'modules', 'onboarding');

// Chunks name
const TRAY = 'tray';
const SETTINGS = 'settings'
const ONBOARDING = 'onboarding'

/**
 * Get postcss setup
 *
 * @param webBuild
 * @returns {{loader: string, options: {postcssOptions: {plugins: ([string,{}]|[((function({}=): Plugin | Processor)|{postcss?: boolean}),{enabled}])[]}}}}
 */
const getPostcssLoader = (webBuild) => ({
    loader: 'postcss-loader',
    options: {
        postcssOptions: {
            plugins: [
                ["postcss-nested", {}],
                postcssSciterPlugin({
                    enabled: !!webBuild
                })
            ]
        }
    }
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

module.exports = ({ webBuild }) => ({
    mode: "development",
    devtool: 'source-map',
    entry: {
        [TRAY]: path.join(trayPath, 'index.tsx'),
        [SETTINGS]: path.join(settingsPath, 'index.tsx'),
        [ONBOARDING]: path.join(onboardingPath, 'index.tsx'),
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: buildAliases(),
        fallback: {
            // We will use polyfills only for web, and we set it explicitly in config
            SciterPolyfills: false
        }
    },
    output: {
        path: buildPath,
        filename: `[name].${MINIFIED_JS_FILE}`,
        clean: true,
        chunkFormat: 'commonjs',
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
                }, 'css-loader', getPostcssLoader(webBuild)],
                exclude: /node_modules/,
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
                        getPostcssLoader(webBuild),
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
            template: path.join(commonPath, 'index.html'),
            filename: `${TRAY}.html`,
            chunks: [TRAY],
            inject: true,
            templateParameters: {
                WEB_BUILD: !!webBuild,
                RESIZEABLE: false,
                WIDTH: 360,
                HEIGHT: 582,
            }
        }),
        new HtmlWebpackPlugin({
            template: path.join(settingsPath, 'index.html'),
            filename: `${SETTINGS}.html`,
            chunks: [SETTINGS],
            inject: true,
            templateParameters: {
                WEB_BUILD: !!webBuild,
                RESIZEABLE: true,
                MIN_WIDTH: 800,
                MIN_HEIGHT: 640,
            }
        }),
        new HtmlWebpackPlugin({
            template: path.join(onboardingPath, 'index.html'),
            filename: `${ONBOARDING}.html`,
            chunks: [ONBOARDING],
            inject: true,
            templateParameters: {
                WEB_BUILD: !!webBuild,
                RESIZEABLE: false,
                MIN_WIDTH: 800,
                MIN_HEIGHT: 640,
            }
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(rootPath, '.twosky.json'),
                    to: buildPath
                },
                // Copy sciter bootstap
                {
                    from: path.join(commonPath, 'sciterBootstrap.ts').replaceAll(/\\/g, '/'),
                    to: path.join(buildPath, 'scripts', 'sciterBootstrap.js')
                },
                {
                    from: webviewPath,
                    to: buildPath
                },
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
    watchOptions: {
        ignored: /dummyBackend\/storageSource\//,
    },
});
