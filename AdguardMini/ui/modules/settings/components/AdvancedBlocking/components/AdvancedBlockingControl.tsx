// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState } from 'preact/hooks';

import { SettingsEvent } from 'Modules/settings/store/modules';
import { usePayedFuncsTitle, useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { Text } from 'UILib';

import { InstallModal } from '../../InstallModal';
import { NotSupportedModal } from '../../NotSupportedModal';
import { SettingsItemSwitch } from '../../SettingsItem';

import { AdguardExtraSwitch } from './AdguardExtraSwitch';
import s from './AdvancedBlockingControl.module.pcss';
import { AdvancedBlockingTitle } from './AdvancedBlockingTitle';
import { SystemWideProtectionSwitch } from './SystemWideProtectionSwitch';

/**
 * Advanced blocking main component
 */
export function AdvancedBlockingControlComponent() {
    const { advancedBlocking, account, telemetry, settings } = useSettingsStore();
    const {
        adguardExtra, realTimeFiltersUpdate,
        urlFilterState: { enabled: systemWideProtectionEnabled, isInstalled },
        urlFilterNew: isSystemWideProtectionNew,
    } = advancedBlocking;

    const { settings: { macos25OrLower, non501User, autoFiltersUpdate } } = settings;

    const [showNotSupportedModal, setShowNotSupportedModal] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);

    const { isLicenseOrTrialActive } = account;

    const isFree = !isLicenseOrTrialActive;

    const isSystemWideProtectionDisabled = macos25OrLower || non501User;

    const payedFuncsTitle = usePayedFuncsTitle(SettingsEvent.TryForFreeAbTest);
    const onAdguardExtraChange = (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.ExtraAbTest);
        if (isFree) {
            account.showPaywall();
            return;
        }
        advancedBlocking.updateAdguardExtra(value);
    };

    const onUpdateSystemWideProtection = (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.SystemWideProtectionEntryClick);
        if (isFree) {
            account.showPaywall();
            return;
        }
        if (!isInstalled && value) {
            setShowInstallModal(true);
            return;
        }
        advancedBlocking.updateSystemWideProtection(value);
    };

    const onUpdateRealTimeFilters = (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.RealTimeAbTest);
        if (isFree) {
            account.showPaywall();
            return;
        }
        advancedBlocking.updateRealTimeFiltersUpdate(value);
    };

    const onUpdateAutoFilters = (value: boolean) => {
        settings.updateAutoFiltersUpdate(value);
        telemetry.trackEvent(SettingsEvent.EnableUpdatesAbTest);
    };

    return (
        <>
            <AdvancedBlockingTitle tryContent={payedFuncsTitle ? (
                <div className={s.AdvancedBlockingControl_payedTitle}>{payedFuncsTitle}</div>
            ) : undefined}
            />
            <SystemWideProtectionSwitch
                disabled={isSystemWideProtectionDisabled}
                isNew={isSystemWideProtectionNew}
                muted={!isLicenseOrTrialActive}
                non501User={non501User}
                macos25OrLower={macos25OrLower}
                orangeIcon={isFree}
                setShowNotSupportedModal={setShowNotSupportedModal}
                value={isLicenseOrTrialActive ? systemWideProtectionEnabled : false}
                onChange={onUpdateSystemWideProtection}
            />
            <AdguardExtraSwitch
                muted={!isLicenseOrTrialActive}
                orangeIcon={isFree}
                value={isLicenseOrTrialActive ? adguardExtra : false}
                onChange={onAdguardExtraChange}
            />
            <SettingsItemSwitch
                additionalText={(!autoFiltersUpdate && (
                    <Text className={theme.color.orange} type="t2">
                        {translate('settings.real.time.filter.updates.enable.update.filters', {
                            b: (text: string) => (
                                <span
                                    className={theme.button.underline}
                                    id="real-time-updates-link"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateAutoFilters(true);
                                    }}
                                >
                                    {text}
                                </span>
                            ),
                        })}
                    </Text>
                ))}
                description={translate('settings.real.time.filter.updates.desc')}
                icon="update"
                iconColor={isFree ? 'orange' : undefined}
                muted={payedFuncsTitle !== undefined || !autoFiltersUpdate}
                setValue={onUpdateRealTimeFilters}
                title={translate('settings.real.time.filter.updates.AG_51019_advanced_settings')}
                value={realTimeFiltersUpdate}
            />
            {showNotSupportedModal && (
                <NotSupportedModal setShowNotSupportedModal={setShowNotSupportedModal} />
            )}
            {showInstallModal && (
                <InstallModal onClose={() => setShowInstallModal(false)} />
            )}
        </>
    );
}

export const AdvancedBlockingControl = observer(AdvancedBlockingControlComponent);
