// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { HiddenStringValue } from '@adg/webview-utils-kit';

import { License } from 'Apis/types';

import type { LicenseOrError } from 'Apis/types';

export type LicenseExtended = Omit<License, 'licenseKey'> & {
    licenseKey: HiddenStringValue;
};

export type LicenseOrErrorExtended = Omit<LicenseOrError, 'license'> & { license?: LicenseExtended };

// Since we do not want licenseKey in logs, we redefine methods.
// To access real value use licenseKey.getHiddenValue()
Object.defineProperty(License.prototype, 'licenseKey', {
    set: function (key: string) {
        this._licenseKey = new HiddenStringValue('***********', key ?? '');
    },
    get: function () {
        return (this._licenseKey as HiddenStringValue);
    },
});
