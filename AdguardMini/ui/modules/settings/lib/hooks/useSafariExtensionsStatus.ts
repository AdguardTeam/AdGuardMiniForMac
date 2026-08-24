// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { SafariExtensionStatus } from 'Apis/types';

import { useSettingsStore } from './useSettingsStore';

const BROKEN_EXTENSION_STATUSES = [
    SafariExtensionStatus.unknown,
    SafariExtensionStatus.converter_error,
    SafariExtensionStatus.safari_error,
];

/**
 * Returns derived Safari extension health status flags.
 * Uses effective (non-flickering) extension statuses that preserve the last
 * known non-loading state during filter conversion.
 */
export const useSafariExtensionsStatus = () => {
    const { settings } = useSettingsStore();

    const {
        safariExtensionsStore: { effectiveExtensionsList, allExtensionsEffectivelyEnabled },
    } = settings;

    const hasExtensionsDisabled = !allExtensionsEffectivelyEnabled;

    const hasExtensionsBroken = effectiveExtensionsList.some(
        (extension) => BROKEN_EXTENSION_STATUSES.includes(extension?.status),
    );

    const hasRulesLimitExceeded = effectiveExtensionsList.some(
        (extension) => extension?.status === SafariExtensionStatus.limit_exceeded,
    );

    return {
        hasExtensionsDisabled,
        hasExtensionsBroken,
        hasRulesLimitExceeded,
    };
};
