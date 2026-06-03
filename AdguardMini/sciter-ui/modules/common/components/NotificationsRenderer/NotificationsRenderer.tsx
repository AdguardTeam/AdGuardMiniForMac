// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { cx } from 'classix';
import { observer } from 'mobx-react-lite';

import { Button } from 'UILib';

import { NotificationContentWrapper } from './NotificationContentWrapper';
import { NotificationIcon } from './NotificationIcon';
import { NotificationIconWrapper } from './NotificationIconWrapper';
import s from './NotificationsRenderer.module.pcss';

import type { NotificationsQueue } from 'Common/stores/NotificationsQueue';

type Props = {
    /** Notification queue store instance */
    notification: NotificationsQueue;
    /** Additional CSS class for the container (for module-specific positioning) */
    className?: string;
};

/**
 * Notification queue renderer
 */
function NotificationsRendererComponent({ notification, className }: Props) {
    const onClose = (id: string) => {
        notification.closeNotify(id);
    };

    if (notification.queueLength === 0) {
        return null;
    }

    return (
        <div className={cx(s.NotificationsRenderer_notificationsContainer, className)}>
            {notification.mapQueue((n, uid) => {
                const { message, closeable = true } = n.props;

                return (
                    <div
                        key={uid}
                        className={cx(
                            s.NotificationsRenderer_notificationWrap,
                            notification.queueLength > 1 && s.NotificationsRenderer_notificationWrap__shadow,
                        )}
                    >
                        <div className={s.NotificationsRenderer_notification}>
                            <NotificationIconWrapper notification={n}>
                                <NotificationIcon notification={n} />
                            </NotificationIconWrapper>

                            <NotificationContentWrapper
                                message={message}
                                notification={n}
                                onCloseNotification={() => onClose(uid)}
                            />

                            {closeable && (
                                <NotificationIconWrapper notification={n}>
                                    <Button
                                        icon="cross"
                                        iconClassName={s.NotificationsRenderer_notification_close}
                                        type="icon"
                                        onClick={() => onClose(uid)}
                                    />
                                </NotificationIconWrapper>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export const NotificationsRenderer = observer(NotificationsRendererComponent);
