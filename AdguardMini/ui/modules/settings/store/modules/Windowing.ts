// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

/** User-rules window open state for WKWebView host. */
export class Windowing {
    private isUserRulesEditorWindowOpened = false;

    /** Ctor. */
    constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
    }

    /** Set the user-rules editor window opened state. */
    public setUserRulesEditorWindowOpened(flag: boolean) {
        this.isUserRulesEditorWindowOpened = flag;
    }

    /** Get the user-rules editor window opened state. */
    public getIsUserRulesEditorWindowOpened() {
        return this.isUserRulesEditorWindowOpened;
    }
}

/** Module-level windowing singleton. */
export const windowing = new Windowing();
