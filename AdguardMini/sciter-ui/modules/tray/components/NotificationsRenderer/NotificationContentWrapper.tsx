// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'preact/hooks';

import { NotificationsQueueVariant } from 'TrayStore/modules';

import { NotificationButtonSwitch } from './NotificationButtonSwitch';
import s from './NotificationsRenderer.module.pcss';

import type { ComponentChild } from 'preact';
import type { NotificationPropsHolder } from 'TrayLib/utils/NotificationPropsHolder';

type Props = {
    message: ComponentChild;
    notification: NotificationPropsHolder;
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

    if ('variant' in notification.props) {
        switch (notification.props.variant) {
            case NotificationsQueueVariant.buttonAccent:
                className = s.NotificationContentWrapper_content__horizontal;
                break;
            case NotificationsQueueVariant.textOnly:
                className = s.NotificationContentWrapper_content__vertical;
                break;
        }
    }

    useEffect(() => {
        notification.props.onMount?.();
    }, [notification.props, notification.props.onMount]);

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
