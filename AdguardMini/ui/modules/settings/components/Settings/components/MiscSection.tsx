// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { buttonProps } from 'Common/lib/keyboardActivation';
import theme from 'Theme';
import { Text } from 'UILib';

import { SettingsItemLink, SettingsItemSwitch } from '../../SettingsItem';
import s from '../Settings.module.pcss';

type Props = {
    allowTelemetry: boolean;
    debugLogging: boolean;
    experimentalSystemWideProtectionEnabled: boolean;
    isRemovingSystemWideProtection: boolean;
    onToggleAllowTelemetry(value: boolean): void;
    onToggleDebugLogging(value: boolean): void;
    onToggleExperimentalSystemWideProtection(value: boolean): void;
    onOpenSystemWideProtection(): void;
    onOpenTelemetryModal(): void;
    onExportLogs(): void;
    showSafariToolbarBadge: boolean;
    updateShowSafariToolbarBadge(value: boolean): void;
};

/**
 * Misc section for settings
 */
export function MiscSection(props: Props) {
    const {
        allowTelemetry,
        debugLogging,
        experimentalSystemWideProtectionEnabled,
        isRemovingSystemWideProtection,
        onExportLogs,
        onOpenSystemWideProtection,
        onOpenTelemetryModal,
        onToggleAllowTelemetry,
        onToggleDebugLogging,
        onToggleExperimentalSystemWideProtection,
        showSafariToolbarBadge,
        updateShowSafariToolbarBadge,
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
                            {...buttonProps(onOpenTelemetryModal, {
                                preventDefault: true,
                                stopPropagation: true,
                            })}
                        >
                            {text}
                        </div>
                    ),
                })}
                value={allowTelemetry}
            />
            <SettingsItemSwitch
                setValue={updateShowSafariToolbarBadge}
                title={translate('settings.safari.toolbar.badge')}
                value={showSafariToolbarBadge}
            />
            <SettingsItemSwitch
                additionalText={(
                    <>
                        {experimentalSystemWideProtectionEnabled && (
                            <div
                                className={s.Settings_experimentalLink}
                                {...buttonProps(onOpenSystemWideProtection, {
                                    preventDefault: true,
                                    stopPropagation: true,
                                })}
                            >
                                <Text type="t2">
                                    {translate('settings.system.wide.experimental.go.to')}
                                </Text>
                            </div>
                        )}
                    </>
                )}
                description={translate('settings.system.wide.experimental.desc')}
                disabled={isRemovingSystemWideProtection}
                setValue={onToggleExperimentalSystemWideProtection}
                title={translate('settings.system.wide.experimental')}
                value={experimentalSystemWideProtectionEnabled}
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
