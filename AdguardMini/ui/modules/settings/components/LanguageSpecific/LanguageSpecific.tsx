// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSearch } from '@adg/webview-utils-kit';
import { observer } from 'mobx-react-lite';
import { useState, useRef } from 'preact/hooks';

import { langsMap } from 'Common/lib/filters/filtersLangsMap';
import { useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, RouteName } from 'SettingsStore/modules';
import theme from 'Theme';
import { Icon, Input, Layout, Modal, Text } from 'UILib';

import { SettingsItemSwitch } from '../SettingsItem';
import { SettingsTitle } from '../SettingsTitle';

import s from './LanguageSpecific.module.pcss';

/**
 * @internal
 */
type IntermediateLangGroup = {
    id: number;
    lang: string;
    title: string;
    ids: number[];
    is_enabled: boolean;
};

/**
 * Language Specific ad blocking page of settings module (sub page of safari protection)
 */
function LanguageSpecificComponent() {
    const { notification, filters, router } = useSettingsStore();

    const { recommendedFiltersByGroups, filtersIndex, filtersMap } = filters;
    const recommendedLangsFiltersIds = recommendedFiltersByGroups[filtersIndex.definedGroups.languageSpecific];

    let langs: IntermediateLangGroup[] = recommendedLangsFiltersIds.reduce<IntermediateLangGroup[]>((acc, id) => {
        const filter = filtersMap.get(id);
        if (!filter) {
            log.error(`Failed to find recommended filter id: ${id}`);
        } else {
            // One row per filter: a filter covering several languages is
            // labelled with all of them ("Spanish + Portuguese") instead of
            // appearing once per language. Filters without locale data in the
            // index fall back to their title, so the row is never blank.
            // `lang` keeps the raw language codes so search still matches them.
            acc.push({
                id: filter.id,
                lang: filter.languages.join(' '),
                title: filter.languages.length > 0
                    ? filter.languages
                        .map((lang) => (langsMap as Record<string, string>)[lang] ?? lang)
                        .join(' + ')
                    : filter.title,
                ids: [filter.id],
                is_enabled: filters.enabledFilters.has(filter.id),
            });
        }
        return acc;
    }, []);

    const sortedLangsRef = useRef(langs.sort((a, b) => {
        if (a.is_enabled && !b.is_enabled) {
            return -1;
        }
        if (!a.is_enabled && b.is_enabled) {
            return 1;
        }
        return a.title.localeCompare(b.title);
    }));

    langs = sortedLangsRef.current
        .map(({ id }) => langs.find((group) => group.id === id)!);

    const {
        foundItems,
        searchQuery,
        updateSearchQuery,
    } = useSearch(langs, ['lang', 'title']);

    const [showDisableModal, setShowDisableModal] = useState(false);

    const onDisableAll = async () => {
        const error = await filters.switchFiltersState(recommendedLangsFiltersIds, false);
        if (error) {
            notification.notify({
                message: getNotificationSomethingWentWrongText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
        setShowDisableModal(false);
    };

    return (
        <Layout className={s.LanguageSpecific} navigation={{ router, route: RouteName.safari_protection, title: translate('menu.safari.protection') }} type="settingsPage">
            <SettingsTitle
                description={translate('language.specific.desc')}
                elements={[{
                    text: translate('disable.all'),
                    action: () => setShowDisableModal(true),
                }]}
                title={translate('language.specific.title')}
            />
            <SettingsItemSwitch
                className={s.LanguageSpecific_mainControl}
                icon="lang"
                setValue={(e) => filters.updateLanguageSpecific(e)}
                title={translate('language.specific.title')}
                value={!!filters.languageSpecific}
            />
            <Input
                className={cx(s.LanguageSpecific_search)}
                id="search"
                placeholder={translate('search')}
                value={searchQuery}
                allowClear
                onChange={(e) => updateSearchQuery(e)}
            />
            {foundItems.length === 0 && (
                <div className={s.LanguageSpecific_emptyResult}>
                    <Icon className={s.LanguageSpecific_emptyResult_icon} icon="noRulesFound" />
                    <div className={s.LanguageSpecific_emptyResult_text}>
                        <Text type="t2">{translate('nothing.found')}</Text>
                    </div>
                </div>
            )}
            {foundItems.map(({ id, ids, title, is_enabled }) => (
                <SettingsItemSwitch
                    key={id}
                    muted={!filters.languageSpecific}
                    setValue={async (e) => filters.switchFiltersState(ids, e)}
                    title={title}
                    value={is_enabled}
                />
            ))}
            {showDisableModal && (
                <Modal
                    description={translate('disable.all.desc')}
                    submitAction={onDisableAll}
                    submitClassName={theme.button.redSubmit}
                    submitText={translate('disable')}
                    title={`${translate('disable.all')}?`}
                    cancel
                    submit
                    onClose={() => setShowDisableModal(false)}
                />
            )}
        </Layout>
    );
}

export const LanguageSpecific = observer(LanguageSpecificComponent);
