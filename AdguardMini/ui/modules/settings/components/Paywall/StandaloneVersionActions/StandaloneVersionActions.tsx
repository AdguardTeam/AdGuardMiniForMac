// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Subscription } from 'Apis/types';
import { provideTrialDaysParam } from 'Common/utils/translate';
import { useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { Button, Text } from 'UILib';

import s from '../Paywall.module.pcss';

/**
 * Actions for paywall component if the current app channel is the standalone channel
 */
function StandaloneVersionActionsComponent() {
    const { account } = useSettingsStore();

    const { trialAvailableDays } = account;

    return (
        <div className={s.Paywall_actions_container}>
            <Button
                className={cx(theme.button.greenSubmit, s.Paywall_actions_button)}
                type="submit"
                onClick={async () => account.requestWebSubscription(Subscription.standalone)}
            >
                <Text lineHeight="none" type="t1">
                    {translate('settings.paywall.get.full.version')}
                </Text>
            </Button>
            {trialAvailableDays > 0 && (
                <Button
                    className={s.Paywall_actions_button}
                    type="outlined"
                    onClick={async () => account.requestWebSubscription(Subscription.trial)}
                >
                    <Text lineHeight="none" type="t1">
                        {translate.plural('settings.paywall.try.for.free', trialAvailableDays, provideTrialDaysParam(trialAvailableDays))}
                    </Text>
                </Button>
            )}
        </div>
    );
}

export const StandaloneVersionActions = observer(StandaloneVersionActionsComponent);
