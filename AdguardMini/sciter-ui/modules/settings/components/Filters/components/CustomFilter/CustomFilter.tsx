// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { isInitializedString } from '@adg/sciter-utils-kit';
import { observer } from 'mobx-react-lite';

import { useDateFormat, DATE_FORMAT, useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationsQueueType, NotificationContext, NotificationsQueueIconType } from 'SettingsStore/modules';
import theme from 'Theme';
import { Button, Checkbox, Text, ExternalLink } from 'UILib';

import s from './CustomFilter.module.pcss';

import type { Filter } from 'Apis/types';

export type CustomFilterProps = {
    filter: Filter;
    onUpdate(): void;
};

/**
    Custom filter view
 */
function CustomFilterComponent({
    filter,
    onUpdate,
}: CustomFilterProps) {
    const { filters, notification, filters: { enabledFilters } } = useSettingsStore();
    const { title, homepage, version, trusted, timeUpdated, rulesCount, id } = filter;

    const onDelete = async () => {
        const { undoDelete, confirmDelete } = filters.prepareCustomFiltersForDeletion([filter]);

        notification.notify({
            message: translate('notification.custom.filter.removed', { name: title }),
            notificationContext: NotificationContext.info,
            iconType: NotificationsQueueIconType.done,
            type: NotificationsQueueType.success,
            undoAction: () => {
                undoDelete();
            },
            onNotificationClose: async () => {
                const error = await confirmDelete();
                if (error) {
                    notification.notify({
                        message: getNotificationSomethingWentWrongText(),
                        notificationContext: NotificationContext.info,
                        type: NotificationsQueueType.warning,
                        iconType: NotificationsQueueIconType.error,
                        closeable: true,
                    });
                }
            },
        });
    };

    const onStateChange = async (state: boolean) => {
        const error = await filters.switchFiltersState([id], state);
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

    const format = useDateFormat();
    const date = format(timeUpdated * 1000, DATE_FORMAT.day_month_year);
    return (
        <div className={s.CustomFilter}>
            <Checkbox
                checked={enabledFilters.has(id)}
                className={s.CustomFilter_checkbox}
                onChange={onStateChange}
            />
            <div className={s.CustomFilter_text}>
                <Text className={cx(s.CustomFilter_text_title)} type="t1">
                    {title}
                    {' '}
                    {trusted && (
                        <div
                            className={cx(s.CustomFilter_text__inline, theme.color.adgGreen)}
                        >
                            {translate('filters.trusted')}
                        </div>
                    )}
                </Text>
                <Text className={cx(s.CustomFilter_text_desc, theme.typo.lhCustom)} type="t2">
                    {translate('filters.version', { version: isInitializedString(version) ? version : '—' })}
                    {' '}
                    (
                    {date}
                    )
                </Text>
                {rulesCount && rulesCount !== 0 && (
                    <Text className={cx(s.CustomFilter_text_desc, theme.typo.lhCustom)} type="t2">{translate('filters.rules', { rules: rulesCount })}</Text>
                )}
                {homepage && (
                    <ExternalLink
                        className={cx(s.CustomFilter_text_homepage, theme.typo.lhCustom)}
                        href={homepage}
                        textType="t2"
                    >
                        {translate('filters.official.website')}
                    </ExternalLink>
                )}
            </div>
            <Button className={cx(theme.button.greenIcon, s.button)} icon="edit" type="icon" onClick={onUpdate} />
            <Button className={cx(theme.button.redIcon, s.button)} icon="trash" type="icon" onClick={async () => onDelete()} />
        </div>
    );
}

export const CustomFilter = observer(CustomFilterComponent);
