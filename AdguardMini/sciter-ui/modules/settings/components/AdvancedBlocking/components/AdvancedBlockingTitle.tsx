// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later
import { observer } from 'mobx-react-lite';

import { SettingsTitle } from '../../SettingsTitle';

import type { JSX } from 'preact';

type AdvancedBlockingTitleProps = {
    tryContent?: JSX.Element;
};

/**
 * Advanced blocking title component
 */
export function AdvancedBlockingTitleComponent({ tryContent }: AdvancedBlockingTitleProps) {
    return (
        <SettingsTitle
            description={translate('advanced.blocking.desc.AG_51019_advanced_settings')}
            title={translate('menu.advanced.blocking.AG_51019_advanced_settings')}
            maxTopPadding
            newLabel
        >
            {tryContent}
        </SettingsTitle>
    );
}

export const AdvancedBlockingTitle = observer(AdvancedBlockingTitleComponent);
