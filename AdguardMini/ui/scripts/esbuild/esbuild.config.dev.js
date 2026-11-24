// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

const { build, context } = require('esbuild');
const {
    runTypeCheckInWorker,
    EXIT_CODE_OK,
} = require('@adg/sciter-infra-utils/configs/esbuild/typeCheck/typeCheck');
const { createTypeCheckPlugin } = require('@adg/sciter-infra-utils/configs/esbuild/typeCheckPlugin');
const { createRebuildLogPlugin } = require('@adg/sciter-infra-utils/configs/esbuild/rebuildLogPlugin');
const createBaseConfig = require('./esbuild.config.base');

// Set when you do not want to imitate pings updates.
const noPings = Boolean(process.env.NO_PINGS);

(async () => {
    const isWatch = process.argv.includes('--watch');
    const baseConfig = await createBaseConfig();

    const config = {
        ...baseConfig,
        define: {
            ...baseConfig.define,
            'process.env.NODE_ENV': '"development"',
            DEV: 'true',
            FULL_LOGS: 'false',
            NO_PINGS: String(noPings),
            WEB_BUILD: 'false',
        },
        minify: false,
        sourcemap: true,
    };

    if (isWatch) {
        // Live type checking and rebuild timing for the watch loop.
        config.plugins = [
            ...config.plugins,
            createRebuildLogPlugin(),
            createTypeCheckPlugin(),
        ];

        const ctx = await context(config);
        await ctx.watch();
        console.log('[esbuild] watching MiniResources/WebUI...');
        return;
    }

    await build(config);

    const typeCheckExitCode = await runTypeCheckInWorker();
    if (typeCheckExitCode !== EXIT_CODE_OK) {
        process.exitCode = typeCheckExitCode;
    }
})().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
