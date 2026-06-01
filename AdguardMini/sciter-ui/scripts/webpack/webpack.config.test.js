// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require('path');
const Webpack = require('webpack');
const { mergeWithCustomize, customizeArray } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const baseConfig = require('./webpack.config.base');

if (!process.env.APP_VERSION) {
    // Allow builds without APP_VERSION for local testing (defaults to 0.0.0).
    // In CI/Xcode, APP_VERSION is always set.
    process.env.APP_VERSION = '0.0.0-test';
}

/**
 * Per-module test peer ports (read by test-peer.js at init via
 * document.attributes["test-peer-port"] set through the HTML <html> element).
 */
const TEST_PEER_PORTS = {
    tray: '7127',
    settings: '7128',
    onboarding: '7129',
};

const TRAY = 'tray';
const SETTINGS = 'settings';
const ONBOARDING = 'onboarding';

/**
 * Absolute path to test-peer.js source (copied as-is, not bundled by webpack).
 */
const testPeerSource = path.resolve(
    __dirname, '..', '..', '..', '..',
    'node_modules', '@adg', 'sciter-test-driver', 'test-peer.js',
);

module.exports = (env) => {
    const { trace } = env;

    return mergeWithCustomize({
        /**
         * Replace HtmlWebpackPlugin instances from base config with
         * test-aware ones that carry per-module testPeerPort.
         */
        customizeArray: (base, override, key) => {
            if (key === 'plugins') {
                const nonHtmlPlugins = base.filter(
                    (p) => !(p instanceof HtmlWebpackPlugin),
                );
                const htmlPlugins = override.filter(
                    (p) => p instanceof HtmlWebpackPlugin,
                );
                const otherPlugins = override.filter(
                    (p) => !(p instanceof HtmlWebpackPlugin),
                );
                return [...nonHtmlPlugins, ...htmlPlugins, ...otherPlugins];
            }
            return undefined; // default merge for everything else
        },
    })(baseConfig(env), {
        devtool: false,
        // Do NOT add test-peer.js to webpack entry — it contains Sciter-native
        // imports (@sys, @sciter, @debug) that cannot be bundled. Instead it
        // is copied as a static file and loaded via <script defer> in HTML.
        plugins: [
            new HtmlWebpackPlugin({
                template: path.join(__dirname, '..', '..', 'modules', 'common', 'index.html'),
                filename: `${TRAY}.html`,
                chunks: [TRAY],
                inject: true,
                templateParameters: {
                    WEB_BUILD: false,
                    RESIZEABLE: false,
                    WIDTH: 360,
                    HEIGHT: 582,
                    testPeerPort: TEST_PEER_PORTS[TRAY],
                },
            }),
            new HtmlWebpackPlugin({
                template: path.join(__dirname, '..', '..', 'modules', SETTINGS, 'index.html'),
                filename: `${SETTINGS}.html`,
                chunks: [SETTINGS],
                inject: true,
                templateParameters: {
                    WEB_BUILD: false,
                    RESIZEABLE: true,
                    MIN_WIDTH: 800,
                    MIN_HEIGHT: 640,
                    testPeerPort: TEST_PEER_PORTS[SETTINGS],
                },
            }),
            new HtmlWebpackPlugin({
                template: path.join(__dirname, '..', '..', 'modules', ONBOARDING, 'index.html'),
                filename: `${ONBOARDING}.html`,
                chunks: [ONBOARDING],
                inject: true,
                templateParameters: {
                    WEB_BUILD: false,
                    RESIZEABLE: false,
                    MIN_WIDTH: 800,
                    MIN_HEIGHT: 640,
                    testPeerPort: TEST_PEER_PORTS[ONBOARDING],
                },
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: testPeerSource,
                        to: 'test-peer.js',
                    },
                ],
            }),
            new Webpack.DefinePlugin({
                DEV: false,
                FULL_LOGS: Boolean(trace),
                VERSION: process.env.APP_VERSION,
            }),
        ],
    });
};
