// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { buttonProps } from 'Common/lib/keyboardActivation';
import { useMailProtectionToggle } from 'SettingsLib/hooks';
import { RouteName, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Text } from 'UILib';

import { SettingsItemLink, SettingsItemSwitch } from '../../SettingsItem';

import s from './MailProtectionSwitch.module.pcss';

/**
 * Props for the Apple Mail tracking protection settings switch.
 */
type Props = {
    isNew?: boolean;
    /**
     * Called on the first enable attempt, to show the Apple Mail extension
     * onboarding dialog.
     */
    onShowOnboarding(): void;
};

/**
 * Apple Mail tracking protection switch component
 */
function MailProtectionSwitchComponent({ isNew = false, onShowOnboarding }: Props) {
    const {
        isFree, isInactive, mailProtection, onUpdate, onEnableFilter,
    } = useMailProtectionToggle({ onShowOnboarding });

    const additionalText = isInactive ? (
        <Text className={theme.color.orange} type="t2">
            {translate('advanced.blocking.mail.tracking.protection.activate', {
                a: (text: string) => (
                    <span
                        className={cx(theme.button.underline, s.MailProtectionSwitch_link)}
                        {...buttonProps(onEnableFilter, { stopPropagation: true })}
                    >
                        {text}
                    </span>
                ),
            })}
        </Text>
    ) : undefined;

    if (isFree) {
        return (
            <SettingsItemLink
                description={translate('advanced.blocking.mail.tracking.protection.desc')}
                icon="mail"
                iconColor="orange"
                internalLink={RouteName.mail_protection}
                newLabel={isNew}
                title={translate('advanced.blocking.mail.tracking.protection')}
                trackTelemetryEvent={SettingsEvent.MailProtectionEntryClick}
            />
        );
    }

    return (
        <SettingsItemSwitch
            additionalText={additionalText}
            description={translate('advanced.blocking.mail.tracking.protection.desc')}
            icon="mail"
            muted={isInactive}
            newLabel={isNew}
            routeName={RouteName.mail_protection}
            setValue={onUpdate}
            title={translate('advanced.blocking.mail.tracking.protection')}
            trackEventOnRouteChange={SettingsEvent.MailProtectionEntryClick}
            value={mailProtection}
        />
    );
}

export const MailProtectionSwitch = observer(MailProtectionSwitchComponent);
