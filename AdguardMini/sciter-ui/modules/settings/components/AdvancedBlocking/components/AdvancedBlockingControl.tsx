// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { ABTestOption, ActiveABTest } from 'Apis/types';
import { SettingsEvent } from 'Modules/settings/store/modules';
import { useABTest, usePayedFuncsTitle, useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { Text } from 'UILib';

import { SettingsItemSwitch } from '../../SettingsItem';

import { AdguardExtraSwitch } from './AdguardExtraSwitch';
import s from './AdvancedBlockingControl.module.pcss';
import { AdvancedBlockingTitle } from './AdvancedBlockingTitle';
import { AdvancedRulesSwitch } from './AdvancedRulesSwitch';

/**
 * Advanced blocking main component
 */
export function AdvancedBlockingControlComponent() {
    const { advancedBlocking, account, telemetry, settings } = useSettingsStore();
    const {
        adguardExtra,
    } = advancedBlocking.advancedBlocking;
    const { isLicenseOrTrialActive } = account;

    const isFree = !isLicenseOrTrialActive;

    const test = useABTest(ActiveABTest.AG_51019_advanced_settings);
    const isBVariant = test === ABTestOption.option_b;

    const payedFuncsTitle = usePayedFuncsTitle(
        isBVariant ? SettingsEvent.TryForFreeAbTest : SettingsEvent.TryForFreeExtraClick,
    );
    const onAdguardExtraChange = (value: boolean) => {
        if (isFree && !isBVariant) {
            account.showPaywall();
            return;
        }

        telemetry.trackEvent(isBVariant ? SettingsEvent.ExtraAbTest : SettingsEvent.AdguardExtraClick);
        advancedBlocking.updateAdguardExtra(value);
    };

    // B variant settings
    const { settings: { autoFiltersUpdate, realTimeFiltersUpdate } } = settings;
    const onUpdateRealTimeFilters = (value: boolean) => {
        if (isFree) {
            return;
        }
        settings.updateRealTimeFiltersUpdate(value);
        telemetry.trackEvent(SettingsEvent.RealTimeAbTest);
    };

    const onUpdateAutoFilters = (value: boolean) => {
        settings.updateAutoFiltersUpdate(value);
        telemetry.trackEvent(SettingsEvent.EnableUpdatesAbTest);
    };

    return (
        <>
            <AdvancedBlockingTitle tryContent={payedFuncsTitle && isBVariant ? (
                <div className={s.AdvancedBlockingControl_payedTitle}>{payedFuncsTitle}</div>
            ) : undefined}
            />
            {!isBVariant && (
                <AdvancedRulesSwitch />
            )}
            <AdguardExtraSwitch
                additionalText={isBVariant ? undefined : payedFuncsTitle}
                isTest={isBVariant}
                muted={!isLicenseOrTrialActive}
                orangeIcon={isFree}
                value={isLicenseOrTrialActive ? adguardExtra : false}
                onChange={onAdguardExtraChange}
            />
            {isBVariant && (
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
            )}
        </>
    );
}

export const AdvancedBlockingControl = observer(AdvancedBlockingControlComponent);
