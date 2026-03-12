// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later
import { observer } from 'mobx-react-lite';

import { ActiveABTest, ABTestOption } from 'Apis/types';
import { useABTest } from 'SettingsLib/hooks';

import { SettingsTitle } from '../../SettingsTitle';

import type { JSX } from 'preact';

type AdvancedBlockingTitleProps = {
    tryContent?: JSX.Element;
};

/**
 * Advanced blocking title component
 */
export function AdvancedBlockingTitleComponent({ tryContent }: AdvancedBlockingTitleProps) {
    const test = useABTest(ActiveABTest.AG_51019_advanced_settings);

    let config = {
        description: translate('advanced.blocking.desc'),
        title: translate('menu.advanced.blocking'),
    };

    if (test === ABTestOption.option_b) {
        config = {
            description: translate('advanced.blocking.desc.AG_51019_advanced_settings'),
            title: translate('menu.advanced.blocking.AG_51019_advanced_settings'),
        };
    }
    return (
        <SettingsTitle
            description={config.description}
            newLabel={test === ABTestOption.option_b}
            title={config.title}
            maxTopPadding
        >
            {tryContent}
        </SettingsTitle>
    );
}

export const AdvancedBlockingTitle = observer(AdvancedBlockingTitleComponent);
