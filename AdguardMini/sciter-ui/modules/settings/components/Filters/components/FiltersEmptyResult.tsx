// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Icon, Text } from 'UILib';

import s from '../Filters.module.pcss';

/**
 * Empty result placeholder shown when search yields no results
 * or when the rules list is empty.
 *
 * @param searchQuery Current search query (determines which icon to show).
 */
export function FiltersEmptyResult({ searchQuery }: { searchQuery: string }) {
    return (
        <div className={s.Filters_emptyResult}>
            <Icon
                className={s.Filters_emptyResult_icon}
                icon={searchQuery ? 'noRulesFound' : 'noRules'}
            />
            <div className={s.Filters_emptyResult_text}>
                <Text type="t2">
                    {searchQuery ? translate('nothing.found') : translate('user.rules.no.rules')}
                </Text>
            </div>
        </div>
    );
}
