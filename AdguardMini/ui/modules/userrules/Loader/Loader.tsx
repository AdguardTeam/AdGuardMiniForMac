// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import s from './Loader.module.pcss';

export type LoaderProps = {
    className?: string;
    color?: 'green' | 'white';
};

/**
 * Simple spinning loader
 */
export function Loader({ className, color = 'green' }: LoaderProps) {
    return (
        <svg className={cx(s.Loader, className, s[`Loader__${color}`])} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M6.2903 5.04255C6.40404 4.9491 6.52011 4.85838 6.63842 4.7705" />
            <path d="M8.55511 3.68286C8.82001 3.57301 9.0913 3.47545 9.36826 3.39089C9.51032 3.34752 9.65388 3.30756 9.79883 3.27112" />
            <path d="M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C9.51472 21 7.26472 19.9926 5.63604 18.364C4.80704 17.535 4.13901 16.545 3.68286 15.4449" />
        </svg>
    );
}
