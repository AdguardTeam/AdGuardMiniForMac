// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { ActiveABTest, ABTestOption } from 'Apis/types';
import { useABTest, usePayedFuncsTitle, useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Text } from 'UILib';

import { SettingsItemSwitch } from '../../SettingsItem';
import s from '../Settings.module.pcss';

/**
 * Updates section component
 */
export function UpdatesSectionComponent() {
    const {
        settings,
        settings: { settings: {
            autoFiltersUpdate,
            realTimeFiltersUpdate,
        } },
        telemetry,
        account,
        account: { isLicenseOrTrialActive },
    } = useSettingsStore();
    const payedFuncsTitle = usePayedFuncsTitle(SettingsEvent.RealTimeUpdatesTryForFreeClick);
    const isTest = useABTest(ActiveABTest.AG_51019_advanced_settings) === ABTestOption.option_b;
    const onUpdateAutoFilters = (value: boolean) => {
        settings.updateAutoFiltersUpdate(value);
        telemetry.trackEvent(SettingsEvent.UpdateFiltersAutoClick);
    };

    const onUpdateRealTimeFilters = (value: boolean) => {
        if (!isLicenseOrTrialActive) {
            account.showPaywall();
            return;
        }
        settings.updateRealTimeFiltersUpdate(value);
        telemetry.trackEvent(SettingsEvent.RealTimeUpdatesClick);
    };

    return (
        <>
            <Text className={s.Settings_sectionTitle} type="h5">{translate('settings.updates')}</Text>
            <SettingsItemSwitch
                description={translate('settings.update.filters.auto.desc')}
                setValue={onUpdateAutoFilters}
                title={translate('settings.update.filters.auto')}
                value={autoFiltersUpdate}
            />
            {!isTest && (
                <SettingsItemSwitch
                    additionalText={payedFuncsTitle || (!autoFiltersUpdate && (
                        <Text className={theme.color.orange} type="t2">
                            {translate('settings.real.time.filter.updates.enable.update.filters', {
                                b: (text: string) => <span className={s.Settings_underline} id="real-time-updates-link">{text}</span>,
                            })}
                        </Text>
                    ))}
                    description={translate('settings.real.time.filter.updates.desc')}
                    muted={payedFuncsTitle !== undefined || !autoFiltersUpdate}
                    setValue={onUpdateRealTimeFilters}
                    title={translate('settings.real.time.filter.updates')}
                    value={realTimeFiltersUpdate}
                />
            )}
        </>
    );
}

export const UpdatesSection = observer(UpdatesSectionComponent);
