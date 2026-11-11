// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { getTdsLink, TDS_PARAMS } from 'Common/utils/links';
import { RouteName } from 'SettingsStore/modules';
import theme from 'Theme';
import { ExternalLink, Text } from 'UILib';

import s from './HowItWorks.module.pcss';

/**
 * How It Works component for Apple Mail tracking protection settings page
 */
export function HowItWorks() {
    return (
        <div className={s.HowItWorks_block}>
            <Text className={cx(s.HowItWorks_block_title, theme.layout.content)} type="h5">
                {translate('advanced.blocking.mail.tracking.protection.how')}
            </Text>
            <Text className={s.HowItWorks_block_desc} type="t1">
                {translate('advanced.blocking.mail.tracking.protection.how.desc')}
            </Text>
            <Text className={s.HowItWorks_block_desc} type="t1">
                {translate('advanced.blocking.mail.tracking.protection.privacy', {
                    a: (text: string) => (
                        <ExternalLink href={getTdsLink(TDS_PARAMS.privacy, RouteName.mail_protection)} textType="t1">
                            {text}
                        </ExternalLink>
                    ),
                })}
            </Text>
        </div>
    );
}
