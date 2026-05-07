// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import qs from 'qs';

import type { RouteName as OnboardingRouteName } from 'OnboardingStore/modules';
import type { RouteName as SettingsRouteName } from 'SettingsStore/modules';
import type { TrayRoute as TrayRouteName } from 'TrayStore/modules';

type TdsRouteName = SettingsRouteName | OnboardingRouteName | TrayRouteName;

// TODO: Use from Context.logLevel
const ENV = {
    DEV: 'dev',
    PROD: 'prod',
};

const TDS_BASE_URLS = {
    [ENV.PROD]: 'https://link.adtidy.org/forward.html?',
    [ENV.DEV]: 'https://adguard.website.agrd.dev/forward.html?',
};

enum TDS_PARAMS {
    filterrules = 'filterrules',
    eula = 'eula',
    privacy = 'privacy',
    acknowledgments = 'acknowledgments',
    versions = 'versions',
    faq_safari = 'faq_safari',
    incorrect_blocking = 'incorrect_blocking',
    appstore = 'appstore',
    home = 'home',
    discuss = 'discuss',
    what_is_extensions = 'what_is_extensions',
    what_filters = 'what_filters',
    filters_policy = 'filters_policy',
    licenses = 'licenses',
    account = 'account',
    trustpilot = 'trustpilot',
    ag_mini_mac_release_blogpost = 'ag_mini_mac_release_blogpost',
    report_bug = 'report_bug',
}

/**
 * TDS links constructor
 */
function getTdsLink(action: TDS_PARAMS, from?: string | TdsRouteName, query: Record<string, any> = {}): string {
    const newQuery = { ...query, action, from, app: 'mac-mini' };

    return `${TDS_BASE_URLS[DEV ? ENV.DEV : ENV.PROD]}${newQuery ? qs.stringify(newQuery) : ''}`;
}

export { getTdsLink, TDS_PARAMS };
