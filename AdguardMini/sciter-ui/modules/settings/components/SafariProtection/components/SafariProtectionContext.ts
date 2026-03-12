// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createContext } from 'preact';

import type { OptionalError } from 'Apis/types';

export type UpdateSwitch = (value: boolean) => Promise<OptionalError | undefined>;

/**
 * Safari protection context values, used to share state and functions between components
 */
export type SafariProtectionContextValue = {
    createErrorWrapper(update: UpdateSwitch): (value: boolean) => Promise<void>;
    createConsentWrapper(filterIds: number[], update: UpdateSwitch): (value: boolean) => Promise<void>;

    showLoginItemModal: boolean;
    closeLoginItemModal(): void;
    openLoginItemsSettings(): void;

    showConsentFilterIds: number[] | undefined;
    closeConsentModal(): void;
    enableConsent(): Promise<void>;
};

export const SafariProtectionContext = createContext<SafariProtectionContextValue | null>(null);
