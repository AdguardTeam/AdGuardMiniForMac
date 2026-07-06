// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * NotificationPropsHolder object for NotificationsQueue
 */
export class NotificationPropsHolder<Props> {
    /**
     * Ctor
     *
     * @param props - notification properties
     */
    constructor(public readonly props: Props) {}
}
