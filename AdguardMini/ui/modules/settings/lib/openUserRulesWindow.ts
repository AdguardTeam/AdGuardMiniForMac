// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { OpenUserRulesWindowRequest } from 'Apis/requests/InternalService';
import { windowing } from 'Modules/settings/store/modules/Windowing';

/** Open user-rules editor window and mark local open-state. */
export function openUserRulesWindow(): void {
    windowing.setUserRulesEditorWindowOpened(true);
    window.API.Execute(new OpenUserRulesWindowRequest()).catch((err) => {
        // Reset the optimistic flag on failure: no `onUserRulesWindowClosed`
        // callback will arrive if the RPC never reached Swift, so the settings
        // UI would otherwise stay stuck in the "editor open" state.
        windowing.setUserRulesEditorWindowOpened(false);
        // eslint-disable-next-line no-console
        console.error('[openUserRulesWindow] RPC failed:', err);
    });
}
