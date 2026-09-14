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
 * Broken statuses a content blocker reload can recover from. A converter
 * error is deliberately excluded: the platform preserves it across reloads
 * (only a successful filter conversion clears it), so a restart action
 * would be a guaranteed no-op for it.
 */
const RESTARTABLE_EXTENSION_STATUSES = [
    SafariExtensionStatus.unknown,
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

    /**
     * Whether at least one broken extension is in a status a content
     * blocker reload can recover from (`unknown` or `safari_error`).
     */
    const hasRestartableExtensionsError = effectiveExtensionsList.some(
        (extension) => RESTARTABLE_EXTENSION_STATUSES.includes(extension?.status),
    );

    const hasRulesLimitExceeded = effectiveExtensionsList.some(
        (extension) => extension?.status === SafariExtensionStatus.limit_exceeded,
    );

    return {
        hasExtensionsDisabled,
        hasExtensionsBroken,
        hasRestartableExtensionsError,
        hasRulesLimitExceeded,
    };
};
