// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import { Button } from 'UILib';

import styles from './ContactSupportLink.module.pcss';

export type ContactSupportLinkProps = {
    text: string;
    onClick?(): void;
    className?: string;
};

/**
 * Renders a link that redirects to the contact support screen on click.
 */
function ContactSupportLinkComponent({ text, onClick, className }: ContactSupportLinkProps) {
    const { router } = useSettingsStore();

    return (
        <Button
            className={cx(styles.ContactSupportLink, className)}
            type="text"
            onClick={(e) => {
                e?.stopPropagation();
                onClick?.();
                router.changePath(RouteName.contact_support);
            }}
        >
            {text}
        </Button>
    );
}

export const ContactSupportLink = observer(ContactSupportLinkComponent);
