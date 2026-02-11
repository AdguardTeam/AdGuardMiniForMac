// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { RouterStore } from 'Modules/common/stores/RouterStore';
import { Subject } from 'Modules/settings/components/SupportContact';

/**
 * Settings routes list
 */
export enum RouteName {
    safari_protection = 'safari_protection',
    language_specific = 'language_specific',
    advanced_blocking = 'advanced_blocking',
    user_rules = 'user_rules',
    user_rule = 'user_rule',
    settings = 'settings',
    safari_extensions = 'safari_extensions',
    filters = 'filters',
    license = 'license',
    support = 'support',
    contact_support = 'contact_support',
    about = 'about',
    quit_reaction = 'quit_reaction',
    migration = 'migration',
    theme = 'theme',
}

/**
 * Settings router store type
 */
export type SettingsRouterStore = RouterStore<RouteName>;

/**
 * License router params type
 */
export type LicenseRouterParams = {
    alreadyPurchased?: boolean;
};

export type ContactSupportRouterParams = {
    subject?: Subject;
};

/**
 * Creates and returns a settings router store
 *
 * @returns A new SettingsRouterStore instance for settings navigation
 */
export function settingsRouterFactory(): SettingsRouterStore {
    return new RouterStore(RouteName.safari_protection);
}
