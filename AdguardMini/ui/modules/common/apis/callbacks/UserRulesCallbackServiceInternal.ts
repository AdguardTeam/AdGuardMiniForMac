/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'SettingsStore';
import { windowing } from 'SettingsStore/modules/Windowing';
import { IUserRulesCallbackServiceInternal } from './UserRulesCallbackService';
import { UserRulesCallbackState, EmptyValue } from '../types'

/* Service handles settings lists  */
export class UserRulesCallbackServiceInternal  implements IUserRulesCallbackServiceInternal {
    async onUserFilterChange(param: UserRulesCallbackState): Promise<EmptyValue> {
        store.userRules.setFromCallback(param);
        return new EmptyValue();
    }

    async onUserRulesWindowClosed(param: EmptyValue): Promise<EmptyValue> {
        windowing.setUserRulesEditorWindowOpened(false);
        // Rules may have changed in the editor; refresh the settings list.
        store.userRules.getUserRules();
        return new EmptyValue();
    }
}
