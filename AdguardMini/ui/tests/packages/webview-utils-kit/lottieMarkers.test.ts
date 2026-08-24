// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractMarkerFrames } from '../../../packages/webview-utils-kit/src/replacements/lottieMarkers';

// Inline marker tables mirroring the shipped Lottie JSON assets at
// `AdguardMini/ui/modules/lottie/{ads,trackers,annoyances}.json`.
// Hardcoded here (instead of read from disk at test runtime) because
// `tsconfig.node-tests.json` (`outDir: "build/tests"`, `rootDir: "."`)
// does NOT emit `.json` files to `outDir`, so `readFileSync` against the
// source-tree path would `ENOENT` under the compiled test's CWD. The
// assertions below already hardcode the expected frame values, so
// this removes the disk-read dependency entirely and keeps the test pure.
const adsData = {
    markers: [
        { tm: 0, cm: 'animationStartFirstMarker', dr: 0 },
        { tm: 33, cm: 'animationLoopFirstMarker', dr: 0 },
        { tm: 101, cm: 'animationLoopLastMarker', dr: 0 },
        { tm: 157, cm: 'animationEndLastLast', dr: 0 },
    ],
};

const trackersData = {
    markers: [
        { tm: 0, cm: 'animationStartFirstMarker', dr: 0 },
        { tm: 22, cm: 'animationLoopFirstMarker', dr: 0 },
        { tm: 110, cm: 'animationLoopLastMarker', dr: 0 },
        { tm: 169, cm: 'animationEndLastLast', dr: 0 },
    ],
};

const annoyancesData = {
    markers: [
        { tm: 0, cm: 'animationStartFirstMarker', dr: 0 },
        { tm: 30, cm: 'animationLoopFirstMarker', dr: 0 },
        { tm: 70, cm: 'animationLoopLastMarker', dr: 0 },
        { tm: 131, cm: 'animationEndLastLast', dr: 0 },
    ],
};

test('extractMarkerFrames returns the Sciter-compatible frame shape for ads.json', () => {
    const frames = extractMarkerFrames(adsData);

    assert.ok(Array.isArray(frames));
    assert.equal(frames.length, 4, 'ads.json has 4 markers');
    assert.deepEqual(
        frames.map((f) => f[1]),
        [0, 33, 101, 157],
    );
});

test('extractMarkerFrames returns the frame shape for trackers.json', () => {
    const frames = extractMarkerFrames(trackersData);
    assert.deepEqual(
        frames.map((f) => f[1]),
        [0, 22, 110, 169],
    );
});

test('extractMarkerFrames returns the frame shape for annoyances.json', () => {
    const frames = extractMarkerFrames(annoyancesData);
    assert.deepEqual(
        frames.map((f) => f[1]),
        [0, 30, 70, 131],
    );
});

test('frame lookup reproduces the upstream markers[a[o][1]] access pattern', () => {
    const frames = extractMarkerFrames(adsData);
    // The adapter calls play({ marker: [0, 2] }); upstream reads
    // markers[0][1] and markers[2][1] as (fromFrame, toFrame).
    assert.equal(frames[0][1], 0);
    assert.equal(frames[2][1], 101);
});
