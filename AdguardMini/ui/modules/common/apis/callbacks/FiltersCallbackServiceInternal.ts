/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'SettingsStore';
import { IFiltersCallbackServiceInternal } from './FiltersCallbackService';
import { EmptyValue, FiltersIndex, StringValue } from '../types'
import { RouteName } from 'Modules/settings/store/modules/SettingsRouter';

/* Service handles filters lists  */
export class FiltersCallbackServiceInternal  implements IFiltersCallbackServiceInternal {
    async OnFiltersUpdate(param: EmptyValue): Promise<EmptyValue> {
        store.filters.getFilters();
        return new EmptyValue();
    }

    async OnFiltersIndexUpdate(param: FiltersIndex): Promise<EmptyValue> {
        store.filters.setIndex(param);
        return new EmptyValue();
    }

    async OnCustomFiltersSubscribe(param: StringValue): Promise<EmptyValue> {
        store.router.changePath(RouteName.filters, {
            groupId: store.filters.filtersIndex.customGroupId,
        });
        store.filters.setCustomFiltersSubscribeURL(param.value);
        return new EmptyValue();
    }
}
