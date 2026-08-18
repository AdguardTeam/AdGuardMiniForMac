// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { RouteName } from 'SettingsStore/modules';

import { SettingsItemLink, SettingsItemSwitch } from '../../SettingsItem';

/**
 * Props for the system-wide protection settings switch.
 */
type Props = {
    muted: boolean;
    value: boolean;
    onChange(value: boolean): void;
    orangeIcon?: boolean;
    isNew?: boolean;
    disabled?: boolean;
};

/**
 * System-wide Protection switch component
 */
export function SystemWideProtectionSwitch(props: Props) {
    const {
        muted,
        value,
        onChange,
        isNew = false,
        orangeIcon = false,
        disabled = false,
    } = props;

    return muted
        ? (
            <SettingsItemLink
                description={translate('advanced.blocking.system.wide.desc')}
                disabled={disabled}
                icon="apps"
                iconColor={orangeIcon ? 'orange' : undefined}
                internalLink={RouteName.system_wide_protection}
                newLabel={isNew}
                title={translate('advanced.blocking.system.wide')}
            />
        ) : (
            <SettingsItemSwitch
                description={translate('advanced.blocking.system.wide.desc')}
                disabled={disabled}
                icon="apps"
                iconColor={orangeIcon ? 'orange' : undefined}
                muted={muted}
                newLabel={isNew}
                routeName={RouteName.system_wide_protection}
                setValue={onChange}
                title={translate('advanced.blocking.system.wide')}
                value={value}
            />
        );
}
