/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'SettingsStore';
import { IUserRulesCallbackServiceInternal } from './UserRulesCallbackService';
import { UserRulesCallbackState, EmptyValue } from '../types'

/* Service handles settings lists  */
export class UserRulesCallbackServiceInternal  implements IUserRulesCallbackServiceInternal {
    async onUserFilterChange(param: UserRulesCallbackState): Promise<EmptyValue> {
        store.callbackHandlers.onUserFilterChange(param);
        return new EmptyValue();
    }
}
