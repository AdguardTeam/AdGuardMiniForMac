// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'Apis/ExtendLicense';

import { ApiServiceExecutor } from '@adg/sciter-utils-kit';
import { xcall } from 'ApiWindow';

// @TODO: MOVE THIS TO declaration.d.ts
declare global {
    interface Window {
        API: ApiServiceExecutor;
    }
}

window.API = new ApiServiceExecutor();

window.xcallWrapper = xcall;
