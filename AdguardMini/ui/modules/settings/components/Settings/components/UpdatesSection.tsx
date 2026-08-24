// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';
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
        } },
        telemetry,
    } = useSettingsStore();
    const onUpdateAutoFilters = (value: boolean) => {
        settings.updateAutoFiltersUpdate(value);
        telemetry.trackEvent(SettingsEvent.UpdateFiltersAutoClick);
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
        </>
    );
}

export const UpdatesSection = observer(UpdatesSectionComponent);
