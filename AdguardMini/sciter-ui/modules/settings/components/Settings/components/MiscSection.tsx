// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';
import { Text } from 'UILib';

import { SettingsItemLink, SettingsItemSwitch } from '../../SettingsItem';
import s from '../Settings.module.pcss';

type Props = {
    allowTelemetry: boolean;
    debugLogging: boolean;
    onToggleAllowTelemetry(value: boolean): void;
    onToggleDebugLogging(value: boolean): void;
    onOpenTelemetryModal(): void;
    onExportLogs(): void;
};

/**
 * Misc section for settings
 */
export function MiscSection(props: Props) {
    const {
        allowTelemetry,
        debugLogging,
        onExportLogs,
        onOpenTelemetryModal,
        onToggleAllowTelemetry,
        onToggleDebugLogging,
    } = props;

    return (
        <>
            <Text className={s.Settings_sectionTitle} type="h5">{translate('settings.miscellaneous')}</Text>
            <SettingsItemSwitch
                setValue={onToggleAllowTelemetry}
                title={translate('telemetry.accept.send.data', {
                    link: (text: string) => (
                        <div
                            className={s.Settings_telemetryModalLink}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onOpenTelemetryModal();
                            }}
                        >
                            {text}
                        </div>
                    ),
                })}
                value={allowTelemetry}
            />
            <SettingsItemSwitch
                additionalText={(
                    <Text className={theme.color.orange} type="t2">
                        {translate('settings.debug.warning')}
                    </Text>
                )}
                description={translate('settings.debug.desc')}
                setValue={onToggleDebugLogging}
                title={translate('settings.debug')}
                value={debugLogging}
            />
            <SettingsItemLink
                description={translate('settings.export.desc')}
                title={translate('settings.export')}
                onClick={onExportLogs}
            />
        </>
    );
}
