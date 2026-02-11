// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { SettingsEvent } from 'Modules/settings/store/modules';
import { useSettingsStore, usePayedFuncsTitle } from 'SettingsLib/hooks';
import { Layout } from 'UILib';

import { SettingsItemSwitch } from '../SettingsItem';
import { SettingsTitle } from '../SettingsTitle';
/**
 * Advanced Blocking page in settings module
 */
function AdvancedBlockingComponent() {
    const { advancedBlocking, account, telemetry } = useSettingsStore();
    const { advancedBlocking: {
        advancedRules,
        adguardExtra,
    } } = advancedBlocking;
    const { isLicenseOrTrialActive } = account;

    const payedFuncsTitle = usePayedFuncsTitle(SettingsEvent.TryForFreeExtraClick);

    return (
        <Layout type="settingsPage">
            <SettingsTitle
                description={translate('advanced.blocking.desc')}
                navigateContactSupport={{ subject: 'other' }}
                title={translate('menu.advanced.blocking')}
                maxTopPadding
            />
            <SettingsItemSwitch
                description={translate('advanced.blocking.rules.desc')}
                icon="star"
                setValue={(e) => {
                    telemetry.trackEvent(SettingsEvent.AdvancedRulesClick);
                    advancedBlocking.updateAdvancedRules(e);
                }}
                title={translate('advanced.blocking.rules')}
                value={advancedRules}
            />
            <SettingsItemSwitch
                additionalText={payedFuncsTitle}
                description={translate('advanced.blocking.extra.desc')}
                icon="extra"
                muted={!isLicenseOrTrialActive}
                setValue={(e) => {
                    if (!isLicenseOrTrialActive) {
                        account.showPaywall();
                        return;
                    }
                    telemetry.trackEvent(SettingsEvent.AdguardExtraClick);
                    advancedBlocking.updateAdguardExtra(e);
                }}
                title={translate('advanced.blocking.extra')}
                value={isLicenseOrTrialActive ? adguardExtra : false}
                newLabel
            />
        </Layout>
    );
}

export const AdvancedBlocking = observer(AdvancedBlockingComponent);
