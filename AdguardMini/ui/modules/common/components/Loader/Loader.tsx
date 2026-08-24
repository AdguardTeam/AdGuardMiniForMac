// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Icon } from 'UILib';

import s from './Loader.module.pcss';

import type { IconProps } from '../Icon/Icon';

export type LoaderProps = Pick<IconProps, 'className' | 'large'>;

/**
 * Simple spinning loader
 */
export function Loader({ className, large }: LoaderProps) {
    return (
        <Icon className={cx(s.Loader, className)} icon="loading" large={large} />
    );
}
