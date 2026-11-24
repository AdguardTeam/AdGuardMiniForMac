// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require('path');
const fs = require('fs-extra');
const {
    runTypeCheckGetExitCode,
    EXIT_CODE_OK,
} = require('@adg/sciter-infra-utils/configs/esbuild/typeCheck/typeCheck');
const { build } = require('esbuild');
const createBaseConfig = require('./esbuild.config.base');

// Enables the verbose logger in the shipped bundle for problem investigation.
const trace = Boolean(process.env.TRACE);

/**
 * Renames esbuild's `<bundle>.LEGAL.txt` files to `<bundle>.LICENSE.txt`.
 * @returns {object} esbuild plugin.
 */
function createLicenseRenamePlugin() {
    return {
        name: 'license-rename',
        setup(buildContext) {
            buildContext.onEnd(async (result) => {
                if (result.errors.length > 0) {
                    return;
                }

                const outdir = buildContext.initialOptions.outdir;
                const entries = await fs.readdir(outdir);
                const legalFiles = entries.filter((name) => name.endsWith('.LEGAL.txt'));

                await Promise.all(legalFiles.map((name) => fs.move(
                    path.join(outdir, name),
                    path.join(outdir, name.replace(/\.LEGAL\.txt$/, '.LICENSE.txt')),
                    { overwrite: true },
                )));
            });
        },
    };
}

(async () => {
    const baseConfig = await createBaseConfig();

    // Fail the build on type errors instead of shipping unverified code.
    const typeCheckExitCode = await runTypeCheckGetExitCode();
    if (typeCheckExitCode !== EXIT_CODE_OK) {
        process.exitCode = typeCheckExitCode;
        return;
    }

    await build({
        ...baseConfig,
        define: {
            ...baseConfig.define,
            'process.env.NODE_ENV': '"production"',
            DEV: 'false',
            FULL_LOGS: String(trace),
            NO_PINGS: 'false',
            WEB_BUILD: 'false',
        },
        // Third-party license notices go to separate, auditable files.
        legalComments: 'external',
        minify: true,
        sourcemap: false,
        plugins: [...baseConfig.plugins, createLicenseRenamePlugin()],
    });
})().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
