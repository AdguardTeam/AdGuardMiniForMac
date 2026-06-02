import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import path from 'path';
import { readFileSync } from 'fs';

/**
 * @file Rollup configurations for generating CSSTokenizer builds.
 *
 * ! Please ALWAYS use the "pnpm build" command for building
 * ! Running Rollup directly will not enough, the build script
 * ! does some additional work before and after running Rollup.
 */


// Common constants
const ROOT_DIR = './';
const BASE_NAME = 'ContentScript';
const PKG_FILE_NAME = 'package.json';

const distDirLocation = path.join(ROOT_DIR, 'dist');
const pkgFileLocation = path.join(ROOT_DIR, PKG_FILE_NAME);

// Read package.json
const pkg = JSON.parse(readFileSync(pkgFileLocation, 'utf-8'));

// Check if the package.json file has all required fields (we need them for
// the banner)
const REQUIRED_PKG_FIELDS = [
    'author',
    'homepage',
    'license',
    'version',
];

for (const field of REQUIRED_PKG_FIELDS) {
    if (!(field in pkg)) {
        throw new Error(`Missing required field "${field}" in ${PKG_FILE_NAME}`);
    }
}

// Generate a banner with the current package & build info.
const BANNER = `/*
 * ${BASE_NAME} v${pkg.version} (build date: ${new Date().toUTCString()})
 * (c) ${new Date().getFullYear()} ${pkg.author}
 * Released under the ${pkg.license} license
 * ${pkg.homepage}
 */`;

// Pre-configured TypeScript plugin.
const typeScriptPlugin = typescript({
    compilerOptions: {
        declaration: false,
    },
});

// Common plugins for all types of builds.
const commonPlugins = [
    json({ preferConst: true }),
    resolve({ preferBuiltins: false }),
    typeScriptPlugin,
];

// Plugins for browser builds.
const browserPlugins = [
    ...commonPlugins,
    // Provide better browser compatibility with Babel.
    getBabelOutputPlugin({
        presets: [
            [
                '@babel/preset-env',
                {
                    targets: {
                        // https://github.com/browserslist/browserslist#best-practices
                        browsers: [
                            'last 1 version',
                            '> 1%',
                            'not dead',

                            // Specific versions
                            'chrome >= 88',
                            'firefox >= 84',
                            'edge >= 88',
                            'opera >= 80',
                            'safari >= 14',
                        ],
                    },
                },
            ],
        ],
        allowAllFormats: true,
        compact: false,
    }),
];

const extensionScript = {
    input: path.join(ROOT_DIR, 'src', 'index.ts'),
    output: {
        file: path.join(distDirLocation, 'advanced-script.js'),
        format: 'iife',
        exports: 'auto',
        sourcemap: false,
        banner: BANNER,
    },
    plugins: browserPlugins,
};

// Export build configs for Rollup
var rollup_config = [extensionScript];

export { rollup_config as default };
