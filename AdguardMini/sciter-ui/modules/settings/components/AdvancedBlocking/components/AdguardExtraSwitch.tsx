// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { SettingsItemSwitch } from '../../SettingsItem';

type Props = {
    muted: boolean;
    value: boolean;
    onChange(value: boolean): void;
    orangeIcon?: boolean;
};

/**
 * AdGuard Extra switch component
 */
export function AdguardExtraSwitch(props: Props) {
    const {
        muted,
        value,
        onChange,
        orangeIcon = false,
    } = props;

    return (
        <SettingsItemSwitch
            description={translate('advanced.blocking.extra.desc')}
            icon="extra"
            iconColor={orangeIcon ? 'orange' : undefined}
            muted={muted}
            setValue={onChange}
            title={translate('advanced.blocking.extra')}
            value={value}
        />
    );
}
