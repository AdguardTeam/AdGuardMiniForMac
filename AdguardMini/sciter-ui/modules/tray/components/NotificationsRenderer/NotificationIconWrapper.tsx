// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { NotificationsQueueVariant } from 'TrayStore/modules';

import s from './NotificationsRenderer.module.pcss';

import type { ComponentChildren } from 'preact';
import type { NotificationPropsHolder } from 'TrayLib/utils/NotificationPropsHolder';

type Props = {
    notification: NotificationPropsHolder;
    children: ComponentChildren;
};

/**
 * Render notification icon wrapper
 *
 * @param notification
 * @param children
 */
export function NotificationIconWrapper({
    notification,
    children,
}: Props) {
    let className = '';

    if ('variant' in notification.props) {
        switch (notification.props.variant) {
            case NotificationsQueueVariant.buttonAccent:
                className = s.NotificationIconWrapper_icon__center;
                break;
            case NotificationsQueueVariant.textOnly:
                className = s.NotificationIconWrapper_icon__top;
                break;
            default:
                break;
        }
    }

    return (
        <div className={cx(s.NotificationIconWrapper_icon, className)}>
            {children}
        </div>
    );
}
