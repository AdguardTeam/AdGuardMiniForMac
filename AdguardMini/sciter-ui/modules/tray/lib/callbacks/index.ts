// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TrayCallbackService } from 'Common/apis/callbacks/TrayCallbackService';
import { TrayCallbackServiceInternal } from 'Common/apis/callbacks/TrayCallbackServiceInternal';

import type { ITrayCallbackService, ITrayCallbackServiceInternal } from 'Common/apis/callbacks/TrayCallbackService';

/**
 * Proto callbacks for Tray module;
 */
export class API_CALLBACK {
    public TrayCallbackService: ITrayCallbackService;

    /**
     *
     */
    constructor(
        trayCallbackService: ITrayCallbackServiceInternal,
    ) {
        this.TrayCallbackService = new TrayCallbackService(trayCallbackService);
    }
}

declare global {
    interface Window {
        // @ts-ignore
        API_CALLBACK: API_CALLBACK;
    }
}

// @ts-ignore
window.API_CALLBACK = new API_CALLBACK(
    new TrayCallbackServiceInternal(),
);
