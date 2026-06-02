// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { NotificationPropsHolder } from 'SettingsLib/utils/NotificationPropsHolder';

import type { ComponentChild } from 'preact';

/**
 * Autoclosing timer for notifications
 */
const DEFAULT_NOTIFY_LIFETIME = 10000;

export enum NotificationsQueueVariant {
    buttonAccent = 'buttonAccent',
    textOnly = 'textOnly',
}

export enum NotificationsQueueType {
    success = 'success',
    warning = 'warning',
    danger = 'danger',
}

export enum NotificationsQueueIconType {
    done = 'done',
    delete = 'trash',
    error = 'error',
    info = 'knowledgebase',
    fire = 'fire',
    unlock = 'unlock',
    clock = 'clock',
    dns = 'dns-protection',
    customRule = 'custom-rule',
    loading = 'loading',
}

/**
 * Notification context - determines notification shape
 */
export enum NotificationContext {
    // Notification with call-to-action button
    ctaButton = 'ctaButton',
    // Basic info notification
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
    onNotificationClose?(): void;
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
        const uuid = window.GenerateUuid();

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
     * Closes notify by uuid
     *
     * @param uuid
     */
    public closeNotify(uuid: string) {
        const notification = this.queue.get(uuid);
        if (notification) {
            const { onNotificationClose } = notification.props;
            onNotificationClose?.();
        }

        this.queue.delete(uuid);
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
