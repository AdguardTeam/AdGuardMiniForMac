// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { ApiServiceExecutor } from '@adg/webview-utils-kit';

import 'Apis/ExtendLicense';
import { xcall } from 'ApiWindow';

// `Window.API` is declared in `@types/declaration.d.ts`; this module only
// installs the runtime instance.
window.API = new ApiServiceExecutor();

window.xcallWrapper = xcall;
