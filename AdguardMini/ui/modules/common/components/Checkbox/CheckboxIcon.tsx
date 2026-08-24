// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Icon } from 'UILib';

import s from './Checkbox.module.pcss';

import type { IconType } from 'UILib';

type CheckboxIconProps = {
    checked: boolean;
    muted?: boolean;
};

/**
 * Icon for checkbox checker
 */
export function CheckboxIcon({ checked, muted }: CheckboxIconProps) {
    const getIconName = (): IconType => {
        if (checked) {
            if (muted) {
                return 'checkbox_muted';
            }

            return 'checkbox_checked';
        }

        return 'checkbox_unchecked';
    };

    return <Icon className={s.Checkbox_handler} icon={getIconName()} />;
}
