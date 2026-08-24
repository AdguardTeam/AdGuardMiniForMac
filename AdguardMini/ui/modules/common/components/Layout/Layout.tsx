// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { forwardRef } from 'preact/compat';

import { NavigationHeader } from 'UILib';

import s from './Layout.module.pcss';

import type { ComponentChildren, Ref } from 'preact';
import type { NavigationHeaderProps } from 'UILib';

export type LayoutProps = {
    type: 'settings' | 'settingsMenu' | 'settingsPage' | 'migration';
    children: ComponentChildren;
    className?: string;
    navigation?: NavigationHeaderProps;
};

/**
 * Layout component
 * Used as root component for each page
 * type:
 *  1) 'settings' - main container of settings, used in settings/App
 *  2) 'settingsMenu' - layout for menu in settings
 *  3) 'settingsPage' - any page in settings container
 */
export const Layout = forwardRef(({ type, navigation, children, className }: LayoutProps, ref: Ref<HTMLDivElement>) => {
    return (
        <div ref={ref} className={cx(s[`Layout__${type}`], className)} id={type}>
            {navigation && <NavigationHeader {...navigation} />}
            {children}
        </div>
    );
});
