// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Icon } from 'UILib';

import s from './Logo.module.pcss';

export type LogoProps = {
    isDarkTheme: boolean;
    className?: string;
};

/**
 * AdGuard Mini logo
 */
export function Logo({ isDarkTheme, className }: LogoProps) {
    return (
        <div key={isDarkTheme ? 'dark' : 'light'} className={cx(s.Logo, className)}>
            <Icon className={s.Logo_logoIcon} icon={isDarkTheme ? 'logo_dark' : 'logo'} />
        </div>
    );
}
