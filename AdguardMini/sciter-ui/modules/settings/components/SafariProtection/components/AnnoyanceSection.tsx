// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Text } from 'UILib';

import { SettingsItemSwitch } from '../../SettingsItem';
import { useSafariProtectionContext } from '../hooks/useSafariProtectionContext';
import s from '../SafariProtection.module.pcss';

/**
 * Annoyance section for Safari protection
 */
export function AnnoyanceSection() {
    const { safariProtection, filters, telemetry } = useSettingsStore();
    const { createConsentWrapper, createErrorWrapper } = useSafariProtectionContext();

    const { filtersIndex } = filters;

    const onToggleBlockSocialButtons = createErrorWrapper(async (value) => {
        telemetry.trackEvent(SettingsEvent.SocialButtonsClick);
        return safariProtection.updateBlockSocialButtons(value);
    });

    const onToggleBlockCookieNotice = createConsentWrapper(
        [filtersIndex.cookieNoticeFilterId],
        async (value) => {
            telemetry.trackEvent(SettingsEvent.CookieClick);
            return safariProtection.updateBlockCookieNotice(value);
        },
    );

    const onToggleBlockPopups = createConsentWrapper(
        [filtersIndex.popUpsFilterId],
        async (value) => {
            telemetry.trackEvent(SettingsEvent.PopUpsClick);
            return safariProtection.updateBlockPopups(value);
        },
    );

    const onToggleBlockWidgets = createConsentWrapper(
        [filtersIndex.widgetsFilterId],
        async (value) => {
            telemetry.trackEvent(SettingsEvent.WidgetsClick);
            return safariProtection.updateBlockWidgets(value);
        },
    );

    const onToggleBlockOtherAnnoyance = createConsentWrapper(
        [filtersIndex.otherAnnoyanceFilterId],
        async (value) => {
            telemetry.trackEvent(SettingsEvent.AnnoyancesClick);
            return safariProtection.updateBlockOther(value);
        },
    );

    return (
        <div className={s.SafariProtection_block}>
            <Text className={cx(s.SafariProtection_block_title, theme.layout.content)} type="h5">{translate('safari.protection.part.annoyance')}</Text>
            <SettingsItemSwitch
                description={translate('safari.protection.block.social.desc')}
                icon="share"
                setValue={onToggleBlockSocialButtons}
                title={translate('safari.protection.block.social')}
                value={safariProtection.blockSocialButtons}
            />
            <SettingsItemSwitch
                description={translate('safari.protection.block.cookie.desc')}
                icon="cookies"
                setValue={onToggleBlockCookieNotice}
                title={translate('safari.protection.block.cookie')}
                value={safariProtection.blockCookieNotice}
            />
            <SettingsItemSwitch
                description={translate('safari.protection.block.popups.desc')}
                icon="annoyance"
                setValue={onToggleBlockPopups}
                title={translate('safari.protection.block.popups')}
                value={safariProtection.blockPopups}
            />
            <SettingsItemSwitch
                description={translate('safari.protection.block.widgets.desc')}
                icon="browser"
                setValue={onToggleBlockWidgets}
                title={translate('safari.protection.block.widgets')}
                value={safariProtection.blockWidgets}
            />
            <SettingsItemSwitch
                description={translate('safari.protection.block.annoyance.desc')}
                icon="widget"
                setValue={onToggleBlockOtherAnnoyance}
                title={translate('safari.protection.block.annoyance')}
                value={safariProtection.blockOtherAnnoyance}
            />
        </div>
    );
}
