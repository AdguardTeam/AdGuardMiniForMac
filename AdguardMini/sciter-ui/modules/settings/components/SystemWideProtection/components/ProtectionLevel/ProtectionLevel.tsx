// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { URLFilterConfiguration, URLFilterProtectionLevel, URLFilterStatus } from 'Apis/types';
import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'Modules/settings/store/modules';
import theme from 'Theme';
import { Radio, Text } from 'UILib';

import s from './ProtectionLevel.module.pcss';

/**
 * Props for System-wide Protection level component
 */
type ProtectionLevelProps = {
    setShowInstallModal(value: boolean): void;
};

/**
 * Mapping of System-wide Protection levels to telemetry events
 */
const SystemWideProtectionLevelToTelemetryEventMap: Record<URLFilterProtectionLevel, SettingsEvent> = {
    [URLFilterProtectionLevel.essential]: SettingsEvent.SystemWideProtectionEssentialClick,
    [URLFilterProtectionLevel.safe]: SettingsEvent.SystemWideProtectionSafeClick,
    [URLFilterProtectionLevel.family]: SettingsEvent.SystemWideProtectionFamilyClick,
};

/**
 * System-wide Protection level component for settings module
 */
function ProtectionLevelComponent({ setShowInstallModal }: ProtectionLevelProps) {
    const { account, advancedBlocking, telemetry } = useSettingsStore();
    const {
        status: systemWideProtectionStatus,
    } = advancedBlocking.urlFilterState;
    const {
        enabled: systemWideProtectionEnabled,
        protectionLevel: systemWideProtectionLevel,
    } = advancedBlocking.urlFilterState.configuration;

    const { isLicenseOrTrialActive } = account;

    const isFree = !isLicenseOrTrialActive;

    const isNeedInstall = systemWideProtectionStatus === URLFilterStatus.unknown
        || systemWideProtectionStatus === URLFilterStatus.invalid;

    const muted = !systemWideProtectionEnabled;

    const onUpdateSystemWideProtectionLevel = (value: URLFilterProtectionLevel) => {
        telemetry.trackEvent(SystemWideProtectionLevelToTelemetryEventMap[value]);
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
            protectionLevel: value,
        }));
    };

    return (
        <>
            <div className={s.ProtectionLevel_block}>
                <Text className={cx(s.ProtectionLevel_block_title, theme.layout.content)} type="h5">
                    {translate('advanced.blocking.system.wide.part.level')}
                </Text>
                <Text className={s.ProtectionLevel_block_desc} type="t1">
                    {translate('advanced.blocking.system.wide.part.level.desc')}
                </Text>
            </div>
            <Radio
                checked={systemWideProtectionLevel === URLFilterProtectionLevel.essential}
                className={s.ProtectionLevel_level}
                muted={muted}
                onClick={() => onUpdateSystemWideProtectionLevel(URLFilterProtectionLevel.essential)}
            >
                <Text type="t1">
                    {translate('advanced.blocking.system.wide.level.essential')}
                </Text>
                <Text className={s.ProtectionLevel_level_desc} type="t2">
                    {translate('advanced.blocking.system.wide.level.essential.desc')}
                </Text>
            </Radio>
            <Radio
                checked={systemWideProtectionLevel === URLFilterProtectionLevel.safe}
                className={s.ProtectionLevel_level}
                muted={muted}
                onClick={() => onUpdateSystemWideProtectionLevel(URLFilterProtectionLevel.safe)}
            >
                <Text type="t1">
                    {translate('advanced.blocking.system.wide.level.safe')}
                </Text>
                <Text className={s.ProtectionLevel_level_desc} type="t2">
                    {translate('advanced.blocking.system.wide.level.safe.desc')}
                </Text>
            </Radio>
            <Radio
                checked={systemWideProtectionLevel === URLFilterProtectionLevel.family}
                className={s.ProtectionLevel_level}
                muted={muted}
                onClick={() => onUpdateSystemWideProtectionLevel(URLFilterProtectionLevel.family)}
            >
                <Text type="t1">
                    {translate('advanced.blocking.system.wide.level.family')}
                </Text>
                <Text className={s.ProtectionLevel_level_desc} type="t2">
                    {translate('advanced.blocking.system.wide.level.family.desc')}
                </Text>
            </Radio>
        </>
    );
}

export const ProtectionLevel = observer(ProtectionLevelComponent);
