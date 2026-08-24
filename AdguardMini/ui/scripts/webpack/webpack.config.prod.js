// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

const Webpack = require('webpack');
const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.config.base');

module.exports = (env) => {
    const { trace } = env;
    return merge(baseConfig(env), {
        mode: "production",
        devtool: false,
        plugins: [
            new Webpack.DefinePlugin({
                DEV: false,
                FULL_LOGS: Boolean(trace),
            }),
            // new Webpack.SourceMapDevToolPlugin({
            //     filename: 'app.js.map',
            //     columns: false,
            //     test: /\.(t|j)sx?$/
            // }),
        ],
    })
};
