// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { ABTestOption, ActiveABTest } from 'Apis/types';
import { useABTest, useNotificationSomethingWentWrongText, useSettingsStore } from 'SettingsLib/hooks';
import { RouteName, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Text } from 'UILib';

import { AdvancedRulesSwitch } from '../../AdvancedBlocking/components/AdvancedRulesSwitch';
import { SettingsItemSwitch } from '../../SettingsItem';
import s from '../SafariProtection.module.pcss';

/**
 * Ad blocking section for Safari protection
 */
function AdBlockingSectionComponent() {
    const { safariProtection, filters, telemetry } = useSettingsStore();
    const notifyError = useNotificationSomethingWentWrongText();

    const onToggleBlockAds = async (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.BlockAdsProtectionClick);
        const error = await safariProtection.updateBlockAds(value);
        if (error) {
            notifyError();
        }
    };

    const onToggleBlockSearchAds = async (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.BlockSearchAds);
        const error = await safariProtection.updateBlockSearchAds(value);
        if (error) {
            notifyError();
        }
    };

    const onToggleLanguageSpecific = (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.LanguageAdBlockingClick);
        return filters.updateLanguageSpecific(value);
    };

    const isTest = useABTest(ActiveABTest.AG_51019_advanced_settings) === ABTestOption.option_b;

    return (
        <div className={s.SafariProtection_block}>
            <Text className={cx(s.SafariProtection_block_title, theme.layout.content)} type="h5">{translate('safari.protection.part.ad.blocking')}</Text>
            <SettingsItemSwitch
                description={translate('safari.protection.block.ads.desc')}
                icon="ads"
                setValue={onToggleBlockAds}
                title={translate('safari.protection.block.ads')}
                value={safariProtection.blockAds}
            />
            <SettingsItemSwitch
                description={translate('safari.protection.block.search.ads.desc')}
                icon="search"
                setValue={onToggleBlockSearchAds}
                title={translate('safari.protection.block.search.ads')}
                value={safariProtection.blockSearchAds}
            />
            <SettingsItemSwitch
                description={translate('safari.protection.block.language.desc')}
                icon="lang"
                routeName={RouteName.language_specific}
                setValue={onToggleLanguageSpecific}
                title={translate('safari.protection.block.language')}
                trackEventOnRouteChange={SettingsEvent.LanguageAdBlockingSettingsClick}
                value={filters.languageSpecific}
            />
            {isTest && <AdvancedRulesSwitch />}
        </div>
    );
}

export const AdBlockingSection = observer(AdBlockingSectionComponent);
