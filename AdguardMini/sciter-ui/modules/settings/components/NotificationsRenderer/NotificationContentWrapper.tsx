// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'preact/hooks';

import { NotificationsQueueVariant } from 'SettingsStore/modules';

import { NotificationButtonSwitch } from './NotificationButtonSwitch';
import s from './NotificationsRenderer.module.pcss';

import type { ComponentChild } from 'preact';
import type { NotificationPropsHolder } from 'SettingsLib/utils/NotificationPropsHolder';
import type { NotificationPropertiesSelector } from 'SettingsStore/modules';

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
            case NotificationsQueueVariant.buttonAccent:
                className = s.NotificationContentWrapper_content__horizontal;
                break;
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
