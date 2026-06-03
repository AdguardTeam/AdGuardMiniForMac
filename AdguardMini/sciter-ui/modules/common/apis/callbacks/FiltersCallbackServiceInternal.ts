/* This code was generated automatically by proto-parser tool version 1 */
import { store } from 'SettingsStore';
import { IFiltersCallbackServiceInternal } from './FiltersCallbackService';
import { EmptyValue, FiltersIndex, StringValue } from '../types'

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
        store.onCustomFiltersSubscribe(param.value);
        return new EmptyValue();
    }
}
