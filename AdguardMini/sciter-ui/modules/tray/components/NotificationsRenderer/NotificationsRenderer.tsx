// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { cx } from 'classix';
import { observer } from 'mobx-react-lite';

import { useTrayStore } from 'TrayLib/hooks';
import { Button } from 'UILib';

import { NotificationContentWrapper } from './NotificationContentWrapper';
import { NotificationIcon } from './NotificationIcon';
import { NotificationIconWrapper } from './NotificationIconWrapper';
import s from './NotificationsRenderer.module.pcss';

/**
 * Notification queue renderer
 */
function NotificationsRendererComponent() {
    const {
        notification,
    } = useTrayStore();

    const onClose = (id: string) => {
        notification.closeNotify(id);
    };

    if (notification.queueLength === 0) {
        return null;
    }

    return (
        <div className={s.NotificationsRenderer_notificationsContainer}>
            {notification.mapQueue((n, uid) => {
                const { message, closeable = true, onCrossClick } = n.props;

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
                                testId="tray-notification-cta-button"
                                message={message}
                                notification={n}
                                onCloseNotification={() => onClose(uid)}
                            />

                            {closeable && (
                                <NotificationIconWrapper notification={n}>
                                    <Button
                                        testId="tray-notification-close-button"
                                        icon="cross"
                                        iconClassName={s.NotificationsRenderer_notification_close}
                                        type="icon"
                                        onClick={() => {
                                            onClose(uid);
                                            onCrossClick?.();
                                        }}
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
