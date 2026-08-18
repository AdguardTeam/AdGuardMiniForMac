// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { URLFilterConfiguration, URLFilterStatus } from 'Apis/types';
import { useIsSystemWideProtectionDisabled, useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'Modules/settings/store/modules';

import { SettingsItemSwitch } from '../../../SettingsItem';

/**
 * Props for System-wide Protection switch component
 */
type SwitchProps = {
    onNeedInstall(configuration: URLFilterConfiguration): void;
};

/**
 * System-wide Protection switch component for settings module
 */
function SwitchComponent({ onNeedInstall }: SwitchProps) {
    const { account, advancedBlocking, telemetry } = useSettingsStore();
    const {
        status: systemWideProtectionStatus,
    } = advancedBlocking.urlFilterState;
    const {
        enabled: systemWideProtectionEnabled,
    } = advancedBlocking.urlFilterState.configuration;

    const { isLicenseOrTrialActive } = account;

    const isFree = !isLicenseOrTrialActive;

    const isDisabled = useIsSystemWideProtectionDisabled();

    const isNeedInstall = systemWideProtectionStatus === URLFilterStatus.unknown
        || systemWideProtectionStatus === URLFilterStatus.invalid;

    const onUpdateSystemWideProtection = (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.SystemWideProtectionToggleClick);
        if (isFree) {
            account.showPaywall();
            return;
        }
        if (isNeedInstall) {
            onNeedInstall(new URLFilterConfiguration({
                ...advancedBlocking.urlFilterState.configuration.toObject(),
                enabled: value,
            }));
            return;
        }
        advancedBlocking.updateSystemWideProtection(new URLFilterConfiguration({
            ...advancedBlocking.urlFilterState.configuration.toObject(),
            enabled: value,
        }));
    };

    return (
        <SettingsItemSwitch
            disabled={isDisabled}
            icon="apps"
            setValue={onUpdateSystemWideProtection}
            title={translate('advanced.blocking.system.wide')}
            value={systemWideProtectionEnabled}
        />
    );
}

export const Switch = observer(SwitchComponent);
