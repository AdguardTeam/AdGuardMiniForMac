// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { cx } from 'classix';

import { NotificationsQueueVariant } from 'Common/stores/NotificationsQueue';

import s from './NotificationsRenderer.module.pcss';

import type { NotificationPropertiesSelector } from 'Common/stores/NotificationsQueue';
import type { NotificationPropsHolder } from 'Common/utils/NotificationPropsHolder';
import type { ComponentChildren } from 'preact';

type Props = {
    notification: NotificationPropsHolder<NotificationPropertiesSelector>;
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
            case NotificationsQueueVariant.textOnly:
                className = s.NotificationIconWrapper_icon__top;
                break;
        }
    }

    return (
        <div className={cx(s.NotificationIconWrapper_icon, className)}>
            {children}
        </div>
    );
}
