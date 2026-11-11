// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useMailProtectionToggle } from 'SettingsLib/hooks';

import { SettingsItemSwitch } from '../../../SettingsItem';

/**
 * Props for Apple Mail tracking protection switch component
 */
type SwitchProps = {
    /**
     * Called on the first enable attempt, to show the Apple Mail extension
     * onboarding dialog.
     */
    onShowOnboarding(): void;
};

/**
 * Apple Mail tracking protection switch component for settings module
 */
function SwitchComponent({ onShowOnboarding }: SwitchProps) {
    const {
        isFree, isInactive, mailProtection, onUpdate,
    } = useMailProtectionToggle({ onShowOnboarding });

    return (
        <SettingsItemSwitch
            description={translate('advanced.blocking.mail.tracking.protection.desc')}
            icon="mail"
            muted={isFree || isInactive}
            setValue={onUpdate}
            title={translate('advanced.blocking.mail.tracking.protection')}
            value={isFree ? false : mailProtection}
        />
    );
}

export const Switch = observer(SwitchComponent);
