// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  test-api.d.ts
//  AdguardMini
//

/**
 * Type augmentation for test compilation.
 *
 * window.API is normally declared in modules/common/api.ts via
 * `declare global { interface Window { API: ApiServiceExecutor; } }`.
 * That file is not included in tsconfig.node-tests.json, so we provide
 * the declaration here for the subset of store files that tests import.
 */

import type { ApiServiceExecutor } from '@adg/sciter-utils-kit/build/apis/classes/ApiServiceExecutor';

declare global {
    interface Window {
        API: ApiServiceExecutor;
    }
}

export {};
