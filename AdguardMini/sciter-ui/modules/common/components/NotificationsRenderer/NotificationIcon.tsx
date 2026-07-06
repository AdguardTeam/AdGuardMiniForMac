// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { cx } from 'classix';

import { NotificationsQueueIconType as NQIconType, NotificationsQueueType } from 'Common/stores/NotificationsQueue';
import { Icon } from 'UILib';

import s from './NotificationsRenderer.module.pcss';

import type { NotificationPropertiesSelector } from 'Common/stores/NotificationsQueue';
import type { NotificationPropsHolder } from 'Common/utils/NotificationPropsHolder';
import type { IconType } from 'UILib';

type Props = {
    notification: NotificationPropsHolder<NotificationPropertiesSelector>;
};

/**
 * Render notification icon
 *
 * @param notification
 */
export function NotificationIcon({ notification }: Props) {
    const { type, iconType } = notification.props;

    let color = '';
    let icon: IconType = 'info';
    let customClassName = '';

    switch (type) {
        case NotificationsQueueType.success:
            color = s.NotificationIcon__green;
            break;
        case NotificationsQueueType.warning:
            color = s.NotificationIcon__orange;
            break;
    }

    switch (iconType) {
        case NQIconType.done: {
            icon = 'logo_check';
            break;
        }
        case NQIconType.error: {
            icon = 'info';
            break;
        }
        case NQIconType.info: {
            icon = 'info';
            break;
        }
        case NQIconType.loading: {
            icon = 'loading';
            customClassName = s.NotificationIcon__loader;
            break;
        }
    }

    return <Icon className={cx(color, customClassName)} icon={icon} />;
}
