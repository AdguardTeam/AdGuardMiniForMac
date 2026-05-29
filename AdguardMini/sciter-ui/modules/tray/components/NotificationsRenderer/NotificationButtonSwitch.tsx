// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { NotificationContext, NotificationsQueueVariant } from 'TrayStore/modules';
import { Button, Text } from 'UILib';

import s from './NotificationsRenderer.module.pcss';

import type { NotificationPropsHolder } from 'TrayLib/utils/NotificationPropsHolder';

type Props = {
    notification: NotificationPropsHolder;
    onCloseNotification(): void;
    testId?: string;
};

const buttonPropsVariant = {
    [NotificationsQueueVariant.buttonAccent]: {
        type: 'outlined',
        size: 'medium',
    },
    [NotificationsQueueVariant.textOnly]: {
        type: 'text',
        size: 'regular',
    },
} as const;

/**
 * Switch for rendering right button component, based on notification context
 *
 * @param notification
 * @param platformType
 * @param onCloseNotification
 */
export function NotificationButtonSwitch({
    notification,
    onCloseNotification,
    testId,
}: Props) {
    const { notificationContext } = notification.props;
    let content;

    switch (notificationContext) {
        case NotificationContext.ctaButton: {
            const { onClick, btnLabel, variant } = notification.props;

            content = (
                <Button
                    testId={testId}
                    onClick={onClick}
                    {...buttonPropsVariant[variant]}
                >
                    <Text type="t1">{btnLabel}</Text>
                </Button>
            );
            break;
        }

        case NotificationContext.info: {
            const { undoAction } = notification.props;

            if (undoAction) {
                content = (
                    <Button
                        testId={testId}
                        type="text"
                        onClick={() => {
                            undoAction();
                            onCloseNotification();
                        }}
                    >
                        <Text type="t1">{translate('undo')}</Text>
                    </Button>
                );
            }

            break;
        }
    }

    return content ? <div className={s.NotificationButtonSwitch_btn}>{content}</div> : null;
}
