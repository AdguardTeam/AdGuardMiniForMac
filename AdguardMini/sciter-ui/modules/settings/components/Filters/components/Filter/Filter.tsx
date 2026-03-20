// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState } from 'preact/hooks';

import { NotificationContext, NotificationsQueueType, NotificationsQueueIconType, RouteName } from 'Modules/settings/store/modules';
import { useSettingsStore, useDateFormat, DATE_FORMAT } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import theme from 'Theme';
import { ExternalLink, Text, ConsentModal } from 'UILib';

import { SettingsItemSwitch } from '../../../SettingsItem';

import s from './Filter.module.pcss';

import type { Filter as FilterEnt } from 'Apis/types';

export type FilterProps = {
    filter: FilterEnt;
};

/**
 * Filter element for filters and filters group pages
 */
function FilterComponent({
    filter,
}: FilterProps) {
    const [showConsentModal, setShowConsentModal] = useState(false);
    const {
        filters, notification, settings, settings: { settings: { consentFiltersIds } }, router } = useSettingsStore();
    const { enabledFilters, filtersMap, filtersIndex: { definedGroups }, languageSpecific } = filters;

    const format = useDateFormat();

    if (!filter) {
        return null;
    }
    // current filter state from filters library
    const serverFilter = filtersMap.get(filter.id);

    const onFilterUpdate = async (e: boolean) => {
        if (!consentFiltersIds.includes(filter.id) && e && filter.groupId === definedGroups.annoyances) {
            setShowConsentModal(true);
            return;
        }

        const error = await filters.switchFiltersState([filter.id], e);
        if (error) {
            notification.notify({
                message: getNotificationSomethingWentWrongText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
    };

    const onEnableConsent = async () => {
        const newConsent = [...consentFiltersIds, filter.id];
        settings.updateUserConsent(newConsent);

        const error = await filters.switchFiltersState([filter.id], true);
        if (error) {
            notification.notify({
                message: getNotificationSomethingWentWrongText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
        setShowConsentModal(false);
    };

    const timeUpdated = Number(serverFilter?.timeUpdated || filter.timeUpdated) * 1000;
    const date = format(timeUpdated, DATE_FORMAT.hours_minutes_day_month_year);

    const showLanguageSpecificDisabled = filter.groupId === definedGroups.languageSpecific && !languageSpecific;

    return (
        <>
            <SettingsItemSwitch
                additionalText={(
                    <>
                        <Text className={cx(s.Filter_desc, theme.typo.lhCustom)} type="t2">
                            {translate('filters.version', { version: serverFilter?.version || filter.version || ' ' })}
                            {' '}
                            (
                            {date}
                            )
                        </Text>
                        {serverFilter?.rulesCount !== 0 && (
                            <Text className={cx(s.Filter_desc, theme.typo.lhCustom)} type="t2">{translate('filters.rules', { rules: serverFilter?.rulesCount })}</Text>
                        )}
                        <ExternalLink
                            className={cx(s.Filter_homepage, theme.typo.lhCustom)}
                            href={filter.homepage}
                            textType="t2"
                        >
                            {translate('filters.official.website')}
                        </ExternalLink>
                        {showLanguageSpecificDisabled && (
                            <Text className={cx(s.Filter_warning, theme.typo.lhCustom, theme.color.orange)} type="t2">
                                {translate('filters.language.specific.disabled', {
                                    btn: (text: string) => (
                                        <span
                                            className={cx(s.Filter_link, theme.color.orange)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.changePath(RouteName.language_specific);
                                            }}
                                        >
                                            <Text type="t2">
                                                {text}
                                            </Text>
                                        </span>
                                    ),
                                })}
                            </Text>
                        )}
                    </>
                )}
                description={filter.description}
                id={`filter_${filter.id}`}
                setValue={onFilterUpdate}
                title={filter.title}
                value={enabledFilters.has(filter.id)}
            />
            {showConsentModal && (
                <ConsentModal
                    filters={[filter]}
                    onClose={() => setShowConsentModal(false)}
                    onEnable={onEnableConsent}
                />
            )}
        </>
    );
}

export const Filter = observer(FilterComponent);
