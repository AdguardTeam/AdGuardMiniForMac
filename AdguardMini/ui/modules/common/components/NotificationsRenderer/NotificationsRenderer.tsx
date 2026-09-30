// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { cx } from 'classix';
import { Observer } from 'mobx-react-lite';

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

/*
 * Deliberately not wrapped in `observer`: it adds `React.memo`, and a memo
 * bail-out inside a `createPortal` subtree makes Preact re-append the rendered
 * DOM through the portal's fake parent, which detaches and re-attaches the
 * notifications and restarts their entrance animation on every host
 * re-render. `Observer` keeps the queue reactivity without the memo wrapper.
 */

/**
 * Notification queue renderer
 */
export function NotificationsRenderer({ notification, className }: Props) {
    const onClose = (id: string) => {
        notification.closeNotify(id);
    };

    return (
        <Observer>
            {() => {
                if (notification.queueLength === 0) {
                    return null;
                }

                const wrapClassName = cx(
                    s.NotificationsRenderer_notificationWrap,
                    notification.queueLength > 1 && s.NotificationsRenderer_notificationWrap__shadow,
                );

                return (
                    <div className={cx(s.NotificationsRenderer_notificationsContainer, className)}>
                        {notification.mapQueue((n, uid) => {
                            const { message, closeable = true } = n.props;

                            return (
                                <div key={uid} className={wrapClassName}>
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
                                            <NotificationIconWrapper
                                                className={s.NotificationIconWrapper_icon__left}
                                                notification={n}
                                            >
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
            }}
        </Observer>
    );
}
