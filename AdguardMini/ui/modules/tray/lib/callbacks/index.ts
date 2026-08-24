// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { TrayCallbackService } from 'Common/apis/callbacks/TrayCallbackService';
import { TrayCallbackServiceInternal } from 'Common/apis/callbacks/TrayCallbackServiceInternal';
import { setupTrayWebViewBridge } from 'Modules/tray/lib/webViewTrayBootstrap';

const trayCallbackService = new TrayCallbackService(new TrayCallbackServiceInternal());
setupTrayWebViewBridge(trayCallbackService);
