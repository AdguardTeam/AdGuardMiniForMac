// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/*
 * `react`/`react-dom` stand-in for the node:test runs. mobx-react-lite
 * imports React, which is not installed as a package; the webpack build
 * aliases it to `preact/compat` (tsconfig.node-tests.json mirrors that alias
 * for tests). Only the members mobx-react-lite uses are re-exported, and the
 * re-export gives the CommonJS build the `__esModule` marker that
 * `require('preact/compat')` alone does not provide.
 */
export {
    forwardRef,
    memo,
    unstable_batchedUpdates,
    useDebugValue,
    useEffect,
    useRef,
    useState,
} from 'preact/compat';
