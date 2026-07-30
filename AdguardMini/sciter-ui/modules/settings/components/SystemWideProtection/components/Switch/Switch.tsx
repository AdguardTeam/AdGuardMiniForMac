// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { URLFilterConfiguration, URLFilterStatus } from 'Apis/types';
import { useSettingsStore } from 'SettingsLib/hooks';

import { SettingsItemSwitch } from '../../../SettingsItem';

/**
 * Props for System-wide Protection switch component
 */
type SwitchProps = {
    setShowInstallModal(value: boolean): void;
};

/**
 * System-wide Protection switch component for settings module
 */
function SwitchComponent({ setShowInstallModal }: SwitchProps) {
    const { account, advancedBlocking } = useSettingsStore();
    const {
        status: systemWideProtectionStatus,
    } = advancedBlocking.urlFilterState;
    const {
        enabled: systemWideProtectionEnabled,
    } = advancedBlocking.urlFilterState.configuration;

    const { isLicenseOrTrialActive } = account;

    const isFree = !isLicenseOrTrialActive;

    const isNeedInstall = systemWideProtectionStatus === URLFilterStatus.unknown
        || systemWideProtectionStatus === URLFilterStatus.invalid;

    const onUpdateSystemWideProtection = (value: boolean) => {
        if (isFree) {
            account.showPaywall();
            return;
        }
        if (isNeedInstall) {
            setShowInstallModal(true);
            return;
        }
        advancedBlocking.updateSystemWideProtection(new URLFilterConfiguration({
            ...advancedBlocking.urlFilterState.configuration.toObject(),
            enabled: value,
        }));
    };

    return (
        <SettingsItemSwitch
            icon="apps"
            setValue={onUpdateSystemWideProtection}
            title={translate('advanced.blocking.system.wide')}
            value={systemWideProtectionEnabled}
        />
    );
}

export const Switch = observer(SwitchComponent);
