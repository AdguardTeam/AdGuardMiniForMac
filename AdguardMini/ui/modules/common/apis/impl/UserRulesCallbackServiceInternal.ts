// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* Implementation of the generated interface; the generator never overwrites this file. */
import { store } from 'SettingsStore';
import { windowing } from 'SettingsStore/modules/Windowing';

import { EmptyValue } from '../types';

import type { IUserRulesCallbackServiceInternal } from '../callbacks/UserRulesCallbackService';
import type { UserRulesCallbackState } from '../types';

/* Service handles settings lists  */
export class UserRulesCallbackServiceInternal implements IUserRulesCallbackServiceInternal {
    public async onUserFilterChange(param: UserRulesCallbackState): Promise<EmptyValue> {
        store.userRules.setFromCallback(param);
        return new EmptyValue();
    }

    public async onUserRulesWindowClosed(_param: EmptyValue): Promise<EmptyValue> {
        windowing.setUserRulesEditorWindowOpened(false);
        // Rules may have changed in the editor; refresh the settings list.
        store.userRules.getUserRules();
        return new EmptyValue();
    }
}
