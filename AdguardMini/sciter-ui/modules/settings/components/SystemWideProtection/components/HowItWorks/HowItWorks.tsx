// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';
import { Text } from 'UILib';

import s from './HowItWorks.module.pcss';

/**
 * How It Works component for System-wide Protection settings page
 */
export function HowItWorks() {
    return (
        <div className={s.HowItWorks_block}>
            <Text className={cx(s.HowItWorks_block_title, theme.layout.content)} type="h5">
                {translate('advanced.blocking.system.wide.part.how')}
            </Text>
            <Text className={s.HowItWorks_block_desc} type="t1">
                {translate('advanced.blocking.system.wide.part.how.desc')}
            </Text>
        </div>
    );
}
