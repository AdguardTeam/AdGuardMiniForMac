// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* Implementation of the generated interface; the generator never overwrites this file. */
import { RouteName } from 'Modules/settings/store/modules/SettingsRouter';
import { store } from 'SettingsStore';

import { EmptyValue } from '../types';

import type { IFiltersCallbackServiceInternal } from '../callbacks/FiltersCallbackService';
import type { FiltersIndex, StringValue } from '../types';

/* Service handles filters lists  */
export class FiltersCallbackServiceInternal implements IFiltersCallbackServiceInternal {
    public async OnFiltersUpdate(_param: EmptyValue): Promise<EmptyValue> {
        store.filters.getFilters();
        return new EmptyValue();
    }

    public async OnFiltersIndexUpdate(param: FiltersIndex): Promise<EmptyValue> {
        store.filters.setIndex(param);
        store.filters.getFilters();
        return new EmptyValue();
    }

    public async OnCustomFiltersSubscribe(param: StringValue): Promise<EmptyValue> {
        store.router.changePath(RouteName.filters, {
            groupId: store.filters.filtersIndex.customGroupId,
        });
        store.filters.setCustomFiltersSubscribeURL(param.value);
        return new EmptyValue();
    }
}
