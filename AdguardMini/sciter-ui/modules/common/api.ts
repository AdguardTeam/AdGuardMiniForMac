// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { ApiServiceExecutor } from '@adg/sciter-utils-kit';

import 'Apis/ExtendLicense';
import { xcall } from 'ApiWindow';

// @TODO: MOVE THIS TO declaration.d.ts
declare global {
    interface Window {
        API: ApiServiceExecutor;
    }
}
window.API = new ApiServiceExecutor();

window.xcallWrapper = xcall;
