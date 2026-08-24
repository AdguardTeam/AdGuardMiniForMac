// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';

import { SettingsItemSwitch } from '../../SettingsItem';

/**
 * Advanced rules switch component
 */
export function AdvancedRulesSwitchComponent() {
    const { advancedBlocking, telemetry } = useSettingsStore();
    const {
        advancedRules,
    } = advancedBlocking.advancedBlocking;
    const onAdvancedRulesChange = (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.AdvancedRulesClick);
        advancedBlocking.updateAdvancedRules(value);
    };
    return (
        <SettingsItemSwitch
            description={translate('advanced.blocking.rules.desc')}
            icon="star"
            setValue={onAdvancedRulesChange}
            title={translate('advanced.blocking.rules')}
            value={advancedRules}
        />
    );
}

export const AdvancedRulesSwitch = observer(AdvancedRulesSwitchComponent);
