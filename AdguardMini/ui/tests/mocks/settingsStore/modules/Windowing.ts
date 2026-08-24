// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Node-test stub for `SettingsStore/modules/Windowing` (the module-level
 * `windowing` singleton). `UserRulesCallbackServiceInternal.onUserRulesWindowClosed`
 * calls `windowing.setUserRulesEditorWindowOpened(false)`; tests install a spy
 * and reset it between cases.
 */

/**
 * Loose windowing holder; tests install `setUserRulesEditorWindowOpened`.
 * `Record<string, any>` is deliberate: tests install/overwrite members (e.g.
 * spy functions) and the callback services read them through this loose
 * holder, so wide member typing is required for the mock to stand in for the
 * real module surface.
 */
export const windowing: Record<string, any> = {};

/** Test helper: removes every installed member (mirror of `__resetForTests`). */
export function __resetWindowingForTests(): void {
    for (const key of Object.keys(windowing)) {
        delete (windowing as Record<string, unknown>)[key];
    }
}
