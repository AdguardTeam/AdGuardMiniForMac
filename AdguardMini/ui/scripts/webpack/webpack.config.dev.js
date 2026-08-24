// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

const Webpack = require('webpack');
const baseConfig = require('./webpack.config.base');
const { merge } = require('webpack-merge');

// if you want to not imitate pings update;
const noPings = !!process.env.NO_PINGS

module.exports = (env) => {
    const { webBuild } = env;

    return merge(baseConfig(env), {
        plugins: [
            new Webpack.ProgressPlugin(),
            new Webpack.DefinePlugin({
                DEV: true,
                VERSION: 1234,
                FULL_LOGS: false,
                NO_PINGS: noPings,
                WEB_BUILD: Boolean(webBuild)
            }),
        ]
    })
};
