// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';

import { SettingsItemSwitch } from '../../../SettingsItem';

/**
 * Props for System-wide Protection switch component
 */
type SwitchProps = {
    onNeedInstall(): void;
};

/**
 * System-wide Protection switch component for settings module
 */
function SwitchComponent({ onNeedInstall }: SwitchProps) {
    const { account, advancedBlocking, telemetry, settings } = useSettingsStore();
    const {
        urlFilterState: { isInstalled, enabled },
    } = advancedBlocking;

    const { isLicenseOrTrialActive } = account;

    const isFree = !isLicenseOrTrialActive;

    const { settings: { macos25OrLower, non501User } } = settings;
    const isDisabled = macos25OrLower || non501User;

    const onUpdateSystemWideProtection = (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.SystemWideProtectionToggleClick);
        if (isFree) {
            account.showPaywall();
            return;
        }
        if (!isInstalled && value) {
            onNeedInstall();
            return;
        }
        advancedBlocking.updateSystemWideProtection(value);
    };

    return (
        <SettingsItemSwitch
            disabled={isDisabled}
            icon="apps"
            setValue={onUpdateSystemWideProtection}
            title={translate('advanced.blocking.system.wide')}
            value={enabled}
        />
    );
}

export const Switch = observer(SwitchComponent);
