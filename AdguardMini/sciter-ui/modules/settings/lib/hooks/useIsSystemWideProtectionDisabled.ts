// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSettingsStore } from './useSettingsStore';

/**
 * Whether the System-wide Protection UI must be inert on the current system.
 *
 * System-wide protection requires macOS 26+ and the UID 501 account. For
 * unsupported accounts every control (switch, protection level, context
 * menu) stays disabled, and only the warning line rendered by the Title
 * component remains visible.
 */
export function useIsSystemWideProtectionDisabled(): boolean {
    const { settings } = useSettingsStore();
    const {
        macos25OrLower,
        non501User,
    } = settings.settings;

    return macos25OrLower || non501User;
}
