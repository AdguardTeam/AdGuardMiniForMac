// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { NotificationPropsHolder } from '../utils/NotificationPropsHolder';

import type { ComponentChild } from 'preact';

declare global {
    /** Sciter runtime UUID generation function, set by sciterBootstrap.ts */
    function GenerateUuid(): string;
}

/**
 * Autoclosing timer for notifications (milliseconds).
 *
 * Exported so tests can advance fake time relative to the real default rather
 * than relying on a guessed literal.
 */
export const DEFAULT_NOTIFY_LIFETIME = 10000;

export enum NotificationsQueueVariant {
    textOnly = 'textOnly',
}

export enum NotificationsQueueType {
    success = 'success',
    warning = 'warning',
}

export enum NotificationsQueueIconType {
    done = 'done',
    error = 'error',
    loading = 'loading',
    info = 'knowledgebase',
}

/**
 * Notification context - determines notification shape
 */
export enum NotificationContext {
    /** Notification with call-to-action button */
    ctaButton = 'ctaButton',
    /** Basic info notification */
    info = 'info',
}

/**
 * Base shape of all notifications
 */
export interface NotificationPropertiesBase {
    message: ComponentChild;
    type: NotificationsQueueType;
    iconType: NotificationsQueueIconType;
    timeout?: number | false;
    closeable?: boolean;
    /**
     * Called when the notification close button is clicked
     * (either manually or via auto-close timeout).
     */
    onClose?(): void;
    onMount?(): void;
}

/**
 * Basic info notification
 */
export interface InfoNotificationProperties extends NotificationPropertiesBase {
    notificationContext: NotificationContext.info;
    undoAction?(): void;
}

/**
 * Notification with call-to-action button
 */
export interface CtaButtonNotificationProperties extends NotificationPropertiesBase {
    variant: NotificationsQueueVariant;
    notificationContext: NotificationContext.ctaButton;
    btnLabel: string;
    onClick(): void;
}

/**
 * Union selector of ALL notify types
 */
export type NotificationPropertiesSelector = InfoNotificationProperties | CtaButtonNotificationProperties;

/**
 * Notifications queue
 */
export class NotificationsQueue {
    /**
     * Notifications queue
     *
     * @protected
     */
    protected readonly queue: Map<string, NotificationPropsHolder<NotificationPropertiesSelector>> = new Map();

    /**
     * Gets queue size
     */
    public get queueLength() {
        return this.queue.size;
    }

    /**
     * Ctor
     */
    constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
    }

    /**
     * Push notification info queue
     *
     * @param props - notification props
     * @param closeOthers - close all others notifications before showing
     */
    public notify(props: NotificationPropertiesSelector, closeOthers?: boolean) {
        const uuid = GenerateUuid();

        if (closeOthers) {
            this.queue.clear();
        }

        this.queue.set(uuid, new NotificationPropsHolder(props));

        const timeout = props.timeout ?? DEFAULT_NOTIFY_LIFETIME;

        if (typeof timeout === 'number') {
            setTimeout(() => {
                this.closeNotify(uuid);
            }, timeout);
        }

        return uuid;
    }

    /**
     * Gets current notify
     *
     * @param uid
     */
    public get(uid: string) {
        return this.queue.get(uid);
    }

    /**
     * Closes notify by uuid and calls its onClose callback.
     *
     * @param uuid
     */
    public closeNotify(uuid: string) {
        const notification = this.queue.get(uuid);
        if (notification) {
            const { onClose } = notification.props;
            onClose?.();
        }

        this.queue.delete(uuid);
    }

    /**
     * Clears all notifications
     */
    public clearAll() {
        this.queue.clear();
    }

    /**
     * Map queue contents
     *
     * @param cb
     */
    public mapQueue(cb: (notify: NotificationPropsHolder<NotificationPropertiesSelector>, uid: string) => any) {
        const out = [];

        for (const [uid, notify] of this.queue) {
            out.push(cb(notify, uid));
        }

        return out;
    }
}
