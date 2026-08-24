// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore, useNotificationSomethingWentWrongText } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Text } from 'UILib';

import { SettingsItemSwitch } from '../../SettingsItem';
import s from '../SafariProtection.module.pcss';

import type { OptionalError } from 'Apis/types';

type AnnoyanceSectionProps = {
    setShowConsent(filterIds: number[]): void;
};

/**
 * Annoyance section for Safari protection
 */
function AnnoyanceSectionComponent({ setShowConsent }: AnnoyanceSectionProps) {
    const { safariProtection, filters, telemetry, settings: { settings: { consentFiltersIds } } } = useSettingsStore();
    const notifyError = useNotificationSomethingWentWrongText();
    const { filtersIndex } = filters;

    const onToggleBlockSocialButtons = async (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.SocialButtonsClick);
        const error = await safariProtection.updateBlockSocialButtons(value);
        if (error) {
            notifyError();
        }
    };

    const onUpdateFiltersWithConsent = (
        filterIds: number[],
        update: (e: boolean) => Promise<OptionalError | undefined>,
    ) => async (e: boolean) => {
        if (!e) {
            const error = await update(e);
            if (error) {
                notifyError();
            }
            return;
        }
        if (filterIds.every((id) => consentFiltersIds.includes(id))) {
            const error = await update(e);
            if (error) {
                notifyError();
            }
        } else {
            setShowConsent(filterIds);
        }
    };

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
                setValue={onUpdateFiltersWithConsent(
                    [filtersIndex.cookieNoticeFilterId],
                    async (e) => {
                        telemetry.trackEvent(SettingsEvent.CookieClick);
                        return safariProtection.updateBlockCookieNotice(e);
                    },
                )}
                title={translate('safari.protection.block.cookie')}
                value={safariProtection.blockCookieNotice}
            />
            <SettingsItemSwitch
                description={translate('safari.protection.block.popups.desc')}
                icon="annoyance"
                setValue={onUpdateFiltersWithConsent(
                    [filtersIndex.popUpsFilterId],
                    async (e) => {
                        telemetry.trackEvent(SettingsEvent.PopUpsClick);
                        return safariProtection.updateBlockPopups(e);
                    },
                )}
                title={translate('safari.protection.block.popups')}
                value={safariProtection.blockPopups}
            />
            <SettingsItemSwitch
                description={translate('safari.protection.block.widgets.desc')}
                icon="browser"
                setValue={onUpdateFiltersWithConsent(
                    [filtersIndex.widgetsFilterId],
                    async (e) => {
                        telemetry.trackEvent(SettingsEvent.WidgetsClick);
                        return safariProtection.updateBlockWidgets(e);
                    },
                )}
                title={translate('safari.protection.block.widgets')}
                value={safariProtection.blockWidgets}
            />
            <SettingsItemSwitch
                description={translate('safari.protection.block.annoyance.desc')}
                icon="widget"
                setValue={onUpdateFiltersWithConsent(
                    [filtersIndex.otherAnnoyanceFilterId],
                    async (e) => {
                        telemetry.trackEvent(SettingsEvent.AnnoyancesClick);
                        return safariProtection.updateBlockOther(e);
                    },
                )}
                title={translate('safari.protection.block.annoyance')}
                value={safariProtection.blockOtherAnnoyance}
            />
        </div>
    );
}

export const AnnoyanceSection = observer(AnnoyanceSectionComponent);
