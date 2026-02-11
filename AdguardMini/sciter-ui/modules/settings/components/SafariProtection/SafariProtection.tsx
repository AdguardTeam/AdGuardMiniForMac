// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState } from 'preact/hooks';

import { useOtherEnabledFilters, useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, RouteName, SettingsEvent, ReportProblemVariant } from 'SettingsStore/modules';
import theme from 'Theme';
import { Layout, Text, Modal, ConsentModal } from 'UILib';

import { SettingsItemSwitch, SettingsItemLink } from '../SettingsItem';
import { SettingsTitle } from '../SettingsTitle';

import s from './SafariProtection.module.pcss';

import type { OptionalError } from 'Apis/types';
import type { FiltersPageParams } from 'SettingsLib/const/routeParams';

/**
 * Safari Protection page in settings module
 */
function SafariProtectionComponent() {
    const { safariProtection, notification, settings, filters, ui, telemetry } = useSettingsStore();
    const [showLoginItemModal, setShowLoginItemModal] = useState(!settings.loginItemEnabled);
    const [showConsent, setShowConsent] = useState<number[]>();
    const { settings: { consentFiltersIds } } = settings;
    const {
        filters: { filters: filtersArr },
        filtersIndex,
    } = filters;

    const otherEnabledFiltersIds = useOtherEnabledFilters();

    const onUpdateFiltersWithConsent = (
        filterIds: number[],
        update: (e: boolean) => Promise<OptionalError | undefined>,
    ) => async (e: boolean) => {
        if (!e) {
            const error = await update(e);
            if (error) {
                notification.notify({
                    message: getNotificationSomethingWentWrongText(),
                    notificationContext: NotificationContext.info,
                    type: NotificationsQueueType.warning,
                    iconType: NotificationsQueueIconType.error,
                    closeable: true,
                });
            }
            return;
        }
        if (filterIds.every((id) => consentFiltersIds.includes(id))) {
            const error = await update(e);
            if (error) {
                notification.notify({
                    message: getNotificationSomethingWentWrongText(),
                    notificationContext: NotificationContext.info,
                    type: NotificationsQueueType.warning,
                    iconType: NotificationsQueueIconType.error,
                    closeable: true,
                });
            }
        } else {
            setShowConsent(filterIds);
        }
    };

    const onEnable = async () => {
        if (!showConsent) {
            return;
        }
        const newConsent = [...consentFiltersIds, ...showConsent];
        settings.updateUserConsent(newConsent);
        const error = await filters.switchFiltersState(showConsent!, true);
        if (error) {
            notification.notify({
                message: getNotificationSomethingWentWrongText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
        setShowConsent(undefined);
    };

    const errorWrapper = (update: (e: boolean) => Promise<OptionalError | undefined>) => async (e: boolean) => {
        const error = await update(e);
        if (error) {
            notification.notify({
                message: getNotificationSomethingWentWrongText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
    };

    const onClose = () => {
        setShowConsent(undefined);
    };

    const onOpenSettings = () => {
        settings.openLoginItemsSettings();
    };

    return (
        <Layout type="settingsPage">
            <SettingsTitle
                description={translate('safari.protection.title.desc')}
                navigateContactSupport={{ subject: 'report_bug' }}
                showReportBugTooltip={ui.reportProblemLabelStatus === ReportProblemVariant.Show}
                title={translate('menu.safari.protection')}
                maxTopPadding
            />
            <div className={s.SafariProtection_block}>
                <Text className={cx(s.SafariProtection_block_title, theme.layout.content)} type="h5">{translate('safari.protection.part.ad.blocking')}</Text>
                <SettingsItemSwitch
                    description={translate('safari.protection.block.ads.desc')}
                    icon="ads"
                    setValue={errorWrapper(async (e) => {
                        telemetry.trackEvent(SettingsEvent.BlockAdsProtectionClick);
                        return safariProtection.updateBlockAds(e);
                    })}
                    title={translate('safari.protection.block.ads')}
                    value={safariProtection.blockAds}
                />
                <SettingsItemSwitch
                    description={translate('safari.protection.block.search.ads.desc')}
                    icon="search"
                    setValue={errorWrapper(async (e) => {
                        telemetry.trackEvent(SettingsEvent.BlockSearchAds);
                        return safariProtection.updateBlockSearchAds(e);
                    })}
                    title={translate('safari.protection.block.search.ads')}
                    value={safariProtection.blockSearchAds}
                />
                <SettingsItemSwitch
                    description={translate('safari.protection.block.language.desc')}
                    icon="lang"
                    routeName={RouteName.language_specific}
                    setValue={(e) => {
                        telemetry.trackEvent(SettingsEvent.LanguageAdBlockingClick);
                        return filters.updateLanguageSpecific(e);
                    }}
                    title={translate('safari.protection.block.language')}
                    trackEventOnRouteChange={SettingsEvent.LanguageAdBlockingSettingsClick}
                    value={filters.languageSpecific}
                />
            </div>
            <div className={s.SafariProtection_block}>
                <Text className={cx(s.SafariProtection_block_title, theme.layout.content)} type="h5">{translate('safari.protection.part.tracking')}</Text>
                <SettingsItemSwitch
                    description={translate('safari.protection.block.trackers.desc')}
                    icon="tracking"
                    setValue={errorWrapper(async (e) => {
                        telemetry.trackEvent(SettingsEvent.BlockTrackerClick);
                        return safariProtection.updateBlockTrackers(e);
                    })}
                    title={translate('safari.protection.block.trackers')}
                    value={safariProtection.blockTrackers}
                />
            </div>
            <div className={s.SafariProtection_block}>
                <Text className={cx(s.SafariProtection_block_title, theme.layout.content)} type="h5">{translate('safari.protection.part.annoyance')}</Text>
                <SettingsItemSwitch
                    description={translate('safari.protection.block.social.desc')}
                    icon="share"
                    setValue={errorWrapper(async (e) => {
                        telemetry.trackEvent(SettingsEvent.SocialButtonsClick);
                        return safariProtection.updateBlockSocialButtons(e);
                    })}
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
            <div className={cx(s.SafariProtection_block, theme.layout.bottomPadding)}>
                <Text className={cx(s.SafariProtection_block_title, theme.layout.content)} type="h5">{translate('safari.protection.part.other')}</Text>
                {otherEnabledFiltersIds.length > 0 && (
                    <SettingsItemLink<FiltersPageParams>
                        description={translate('safari.protection.block.other.desc', { value: otherEnabledFiltersIds.length })}
                        internalLink={RouteName.filters}
                        internalLinkParams={{
                            filtersIds: otherEnabledFiltersIds,
                            backLink: RouteName.safari_protection,
                        }}
                        title={translate('safari.protection.other.filters')}
                        trackTelemetryEvent={SettingsEvent.OtherFiltersClick}
                    />
                )}
                <SettingsItemLink<FiltersPageParams>
                    description={translate('safari.protection.block.other.desc', { value: safariProtection.enabledCustomFiltersCount })}
                    internalLink={RouteName.filters}
                    internalLinkParams={{ groupId: filtersIndex.customGroupId, backLink: RouteName.safari_protection }}
                    title={translate('filters.custom.filters')}
                />
            </div>
            {showLoginItemModal && (
                <Modal
                    cancel={false}
                    description={translate('login.item.modal.desc')}
                    submitAction={onOpenSettings}
                    submitClassName={theme.button.greenSubmit}
                    submitText={translate('login.item.open.settings')}
                    title={translate('login.item.modal.title')}
                    submit
                    onClose={() => setShowLoginItemModal(false)}
                />
            )}
            {showConsent && (
                <ConsentModal
                    filters={filtersArr.filter((f) => showConsent?.includes(f.id))}
                    onClose={onClose}
                    onEnable={onEnable}
                />
            )}
        </Layout>
    );
}

export const SafariProtection = observer(SafariProtectionComponent);
