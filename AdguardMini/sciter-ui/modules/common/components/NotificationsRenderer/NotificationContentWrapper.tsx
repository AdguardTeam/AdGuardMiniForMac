// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { cx } from 'classix';
import { useEffect } from 'preact/hooks';

import { NotificationsQueueVariant } from 'Common/stores/NotificationsQueue';

import { NotificationButtonSwitch } from './NotificationButtonSwitch';
import s from './NotificationsRenderer.module.pcss';

import type { NotificationPropertiesSelector } from 'Common/stores/NotificationsQueue';
import type { NotificationPropsHolder } from 'Common/utils/NotificationPropsHolder';
import type { ComponentChild } from 'preact';

type Props = {
    message: ComponentChild;
    notification: NotificationPropsHolder<NotificationPropertiesSelector>;
    onCloseNotification(): void;
};

/**
 * Render notification content wrapper
 *
 * @param message
 * @param notification
 * @param onCloseNotification
 */
export function NotificationContentWrapper({
    message,
    notification,
    onCloseNotification,
}: Props) {
    let className = '';

    useEffect(() => {
        notification.props.onMount?.();
    }, [notification.props, notification.props.onMount]);

    if ('variant' in notification.props) {
        switch (notification.props.variant) {
            case NotificationsQueueVariant.textOnly:
                className = s.NotificationContentWrapper_content__vertical;
                break;
        }
    }

    return (
        <div className={cx(s.NotificationContentWrapper_content, className)}>
            <div className={s.NotificationContentWrapper_label}>
                {message}
            </div>
            <NotificationButtonSwitch
                notification={notification}
                onCloseNotification={onCloseNotification}
            />
        </div>
    );
}
