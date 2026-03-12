// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { SettingsItemSwitch } from '../../SettingsItem';

import type { JSX } from 'preact';

type Props = {
    additionalText: JSX.Element | undefined;
    muted: boolean;
    value: boolean;
    onChange(value: boolean): void;
    orangeIcon?: boolean;
    isTest?: boolean;
};

/**
 * AdGuard Extra switch component
 */
export function AdguardExtraSwitch(props: Props) {
    const {
        additionalText,
        muted,
        value,
        onChange,
        isTest = false,
        orangeIcon = false,
    } = props;

    return (
        <SettingsItemSwitch
            additionalText={additionalText}
            description={translate('advanced.blocking.extra.desc')}
            icon="extra"
            iconColor={orangeIcon ? 'orange' : undefined}
            muted={muted}
            newLabel={!isTest}
            setValue={onChange}
            title={translate('advanced.blocking.extra')}
            value={value}
        />
    );
}
