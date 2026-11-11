// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { SettingsEvent } from 'Modules/settings/store/modules';
import { usePayedFuncsTitle, useSettingsStore } from 'SettingsLib/hooks';

import { SettingsTitle } from '../../../SettingsTitle';

import s from './Title.module.pcss';

/**
 * Apple Mail tracking protection title component for settings module
 */
function TitleComponent() {
    const { advancedBlocking } = useSettingsStore();
    const { mailProtectionNew } = advancedBlocking;

    const payedFuncsTitle = usePayedFuncsTitle(SettingsEvent.MailProtectionPaywallClick);

    return (
        <SettingsTitle
            description={translate('advanced.blocking.mail.tracking.protection.desc')}
            newLabel={mailProtectionNew}
            title={translate('advanced.blocking.mail.tracking.protection')}
        >
            {payedFuncsTitle && (
                <div className={s.Title_payedTitle}>
                    {payedFuncsTitle}
                </div>
            )}
        </SettingsTitle>
    );
}

export const Title = observer(TitleComponent);
