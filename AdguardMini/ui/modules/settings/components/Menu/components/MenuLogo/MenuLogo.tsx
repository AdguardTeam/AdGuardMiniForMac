// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { buttonProps } from 'Common/lib/keyboardActivation';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import { Logo } from 'UILib';

import s from './MenuLogo.module.pcss';

/**
 * Props for the settings menu logo control.
 */
export type MenuLogoProps = {
    /** Whether the dark logo variant should be shown. */
    isDarkTheme: boolean;
};

/**
 * AdGuard Mini logo in the settings menu. The whole logo is a control that
 * returns to the main settings screen, Safari protection.
 */
export function MenuLogo({ isDarkTheme }: MenuLogoProps) {
    const { router } = useSettingsStore();

    return (
        <div
            aria-label={translate('aria.elements.navigation', { text: translate('menu.safari.protection') })}
            className={s.MenuLogo}
            {...buttonProps(() => router.changePath(RouteName.safari_protection))}
        >
            <Logo isDarkTheme={isDarkTheme} />
        </div>
    );
}
