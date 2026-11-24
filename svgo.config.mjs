// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

// In SVGO 4 `removeViewBox` and `removeTitle` left `preset-default`, so both
// survive without an override; only `removeDesc` stays in and must be disabled.
//
// `removeUselessStrokeAndFill` keeps `stroke` because some icons take their
// stroke from CSS, and the plugin then drops `stroke-width` from files that
// carry no inline `stroke` attribute.
//
// `collapseGroups` is off because 4.1.0 drops a group `opacity` whose child
// has its own; `opacity` multiplies rather than inherits, so art gets denser.
export default {
    multipass: true,
    plugins: [
        {
            name: 'preset-default',
            params: {
                overrides: {
                    removeDesc: false,
                    removeUselessStrokeAndFill: {
                        stroke: false,
                    },
                    collapseGroups: false,
                },
            },
        },
    ],
};
