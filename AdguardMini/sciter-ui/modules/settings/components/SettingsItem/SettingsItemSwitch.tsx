// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Switch } from 'UILib';

import { SettingsItem } from './SettingsItem';

import type { SettingsItemProps } from './SettingsItem';

export type SettingsItemSwitchProps = SettingsItemProps & {
    id?: string;
    value: boolean;
    setValue(e: boolean): void;
    muted?: boolean;
    disabled?: boolean;
};

/**
 * SettingsItemSwitch - predefined basic component with switch
 */
export function SettingsItemSwitch({
    id,
    value,
    setValue,
    muted,
    disabled,
    iconColor,
    ...rest
}: SettingsItemSwitchProps) {
    const isEnabled = value && !muted;

    return (
        <SettingsItem
            {...rest}
            iconColor={iconColor ?? (isEnabled ? 'green' : 'gray')}
            onContainerClick={() => {
                if (disabled) {
                    return;
                }
                setValue(!value);
            }}
        >
            <Switch checked={value} disabled={disabled} id={id} muted={muted} onChange={setValue} />
        </SettingsItem>
    );
}
