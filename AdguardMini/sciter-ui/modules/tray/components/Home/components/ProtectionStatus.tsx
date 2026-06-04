// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { OpenSafariExtensionPreferencesRequest } from 'Apis/requests/SettingsService';
import { OptionalStringValue } from 'Apis/types';
import { getCountableEntityStatuses } from 'Common/utils/utils';
import { useTrayStore } from 'TrayLib/hooks';
import { TrayEvent } from 'TrayStore/modules';
import { Text, Switch } from 'UILib';

import s from '../Home.module.pcss';

/**
 * Opens Safari preferences window
 */
const openSafariPreferences = () => {
    window.API.Execute(new OpenSafariExtensionPreferencesRequest(new OptionalStringValue()));
};

interface ProtectionStatusProps {
    isLoading: boolean;
}

/**
 * Protection status section: shows enabled/disabled text and the main toggle switch.
 */
export function ProtectionStatus({ isLoading }: ProtectionStatusProps) {
    const { traySettings, safariExtensions, telemetry } = useTrayStore();

    const { settings } = traySettings;

    if (!settings) {
        return null;
    }

    const { enabled } = settings;

    const {
        allDisabled: allExtensionsDisabled,
        someDisabled: someExtensionsDisabled,
        allEnabled: allExtensionsEnabled,
    } = getCountableEntityStatuses(
        safariExtensions.enabledSafariExtensionsCount,
        safariExtensions.safariExtensionsCount,
    );

    const getDisabledExtensionsStatus = () => {
        if (someExtensionsDisabled) {
            return translate('tray.home.title.protection.extensions.disabled', {
                link: (text: string) => (
                    <div onClick={() => {
                        telemetry.trackEvent(TrayEvent.FixItClick);
                        openSafariPreferences();
                    }}
                    >
                        {text}
                    </div>
                ),
            });
        }
        if (allExtensionsDisabled) {
            return translate('tray.home.title.protection.extensions.all.disabled', {
                link: (text: string) => (<div onClick={openSafariPreferences}>{text}</div>),
            });
        }
    };

    const handleToggleSwitch = (checked: boolean) => {
        traySettings.updateSettings(checked);
        telemetry.trackEvent(TrayEvent.MainProtectionClick);
    };

    return (
        <>
            {isLoading ? (
                <>
                    <Text className={s.Home_title} type="h4">
                        {translate('tray.home.title.converting')}
                    </Text>
                    <Text className={s.Home_status} type="t2">
                        {translate('tray.home.title.converting.desc')}
                    </Text>
                </>
            ) : (
                <>
                    <Text className={s.Home_title} type="h4">
                        {enabled ? translate('tray.home.title.protection.enabled') : translate('tray.home.title.protection.disabled')}
                    </Text>
                    <Text className={cx(s.Home_status, !allExtensionsEnabled && s.Home_extensionsDisabled)} type="t2" div>
                        {allExtensionsEnabled && (enabled ? translate('tray.home.title.protection.enabled.desc') : translate('tray.home.title.protection.disabled.desc'))}
                        {getDisabledExtensionsStatus()}
                    </Text>
                </>
            )}
            <Switch
                checked={!!enabled}
                className={s.Home_switch}
                icon
                onChange={handleToggleSwitch}
            />
        </>
    );
}
