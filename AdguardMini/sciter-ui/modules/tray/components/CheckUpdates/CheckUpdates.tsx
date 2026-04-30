// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect } from 'preact/hooks';

import { RequestApplicationUpdateRequest } from 'Apis/requests/SettingsService';
import { ReleaseVariants } from 'Apis/types';
import { ADGUARD_MINI_TITLE } from 'Common/utils/consts';
import theme from 'Theme';
import { useTrayStore, useMoreFrequentUpdatesNotify, useDateFormat, DATE_FORMAT } from 'TrayLib/hooks';
import { provideContactSupportParam } from 'TrayLib/utils/translate';
import { TrayEvent, TrayRoute } from 'TrayStore/modules';
import { Button, Icon, Text, Loader } from 'UILib';

import s from './CheckUpdates.module.pcss';

import type { IconType } from 'UILib';

/**
 * Used to define type of icon to be shown with needed css
 */
function getIconProps(shouldUpdate: boolean): { icon: IconType; className: string } {
    return {
        icon: !shouldUpdate
            ? 'logo_check'
            : 'info',
        className: cx(
            s.CheckUpdates_element_title_icon,
            !shouldUpdate
                ? s.CheckUpdates_element_title_icon__updated
                : s.CheckUpdates_element_title_icon__info,
        ) };
}

/**
 * Check Updates page in tray - RouteName.update;
 */
function CheckUpdatesComponent() {
    const { settings, router, notification, telemetry } = useTrayStore();
    const {
        newVersionAvailable,
        filtersUpdating,
        filtersUpdateResult,
        filtersMap,
        settings: globalSettings,
    } = settings;

    // TODO: AG-45393 check all casts params are not inlined
    const params = router.castParams<{ noUpdate: boolean }>();
    useEffect(() => {
        if (!params?.noUpdate) {
            settings.checkFiltersUpdate();
        }
        if (!params?.noUpdate && globalSettings?.releaseVariant === ReleaseVariants.standAlone) {
            settings.checkApplicationVersion();
        }
    }, [params?.noUpdate, globalSettings?.releaseVariant, settings]);

    useMoreFrequentUpdatesNotify();

    const format = useDateFormat();

    const versionIsChecking = newVersionAvailable === undefined;

    let titleDesc = '';
    if (versionIsChecking || filtersUpdating) {
        titleDesc = translate('tray.update.check.updates');
    }
    if (newVersionAvailable) {
        titleDesc = translate('tray.update.updates.available');
    }
    if (filtersUpdateResult?.status.length === 0 && !newVersionAvailable) {
        titleDesc = translate('tray.update.no.update');
    }

    const onUpdate = () => {
        window.API.Execute(new RequestApplicationUpdateRequest());
    };

    const onFiltersFix = () => {
        settings.tryAgainFiltersUpdate();
    };

    let filtersStatus: 'updated' | 'error' | 'nothingToUpdate' | null = null;
    if (filtersUpdateResult?.error) {
        filtersStatus = 'error';
    } else if (filtersUpdateResult?.status.length === 0) {
        filtersStatus = 'nothingToUpdate';
    } else if (filtersUpdateResult?.status.every((f) => f.success)) {
        filtersStatus = 'updated';
    }

    const onShowResults = () => {
        router.changePath(TrayRoute.filters);
        notification.clearAll();
    };

    const filtersHoverable = !filtersUpdating && (filtersStatus === 'updated' || filtersStatus === 'error') && filtersMap;

    return (
        <div className={s.CheckUpdates}>
            <div className={s.CheckUpdates_header}>
                <Button
                    icon="back"
                    iconClassName={theme.button.grayIcon}
                    type="icon"
                    onClick={() => {
                        router.changePath(TrayRoute.home);
                        notification.clearAll();
                    }}
                />
            </div>
            <div>
                <Text className={s.CheckUpdates_title} type="h4">{translate('tray.updates')}</Text>
                <Text className={s.CheckUpdates_desc} type="t1">{titleDesc}</Text>
                {globalSettings?.releaseVariant === ReleaseVariants.standAlone && (
                    <div className={s.CheckUpdates_element}>
                        <div className={s.CheckUpdates_element_title}>
                            {newVersionAvailable === undefined ? (
                                <Loader className={s.CheckUpdates_element_title_icon} />
                            ) : (
                                <Icon {...getIconProps(newVersionAvailable)} />
                            )}
                            <div>
                                <Text className={s.CheckUpdates_element_title_text} type="t1">{ADGUARD_MINI_TITLE}</Text>
                                {newVersionAvailable === undefined && (<Text type="t2">{translate('tray.update.check.updates')}</Text>)}
                                {typeof newVersionAvailable === 'boolean' && (newVersionAvailable
                                    ? (<Text type="t2">{translate('new.version.available')}</Text>)
                                    : (<Text type="t2">{translate('up.to.date')}</Text>)
                                )}
                            </div>
                        </div>
                        {newVersionAvailable && (
                            <Button className={s.CheckUpdates_element_button} type="outlined" onClick={onUpdate}>
                                <Text className={s.CheckUpdates_element_button_text} type="t1">{translate('update')}</Text>
                            </Button>
                        )}
                    </div>
                )}
                <div className={s.CheckUpdates_element}>
                    <div
                        className={cx(s.CheckUpdates_element_title,
                            filtersHoverable && s.CheckUpdates_element_title__hover)}
                        onClick={() => {
                            if (filtersHoverable) {
                                onShowResults();
                                telemetry.trackEvent(TrayEvent.UpdatesFiltersClick);
                            }
                        }}
                    >
                        {filtersUpdating || !filtersMap ? (
                            <Loader className={s.CheckUpdates_element_title_icon} />
                        ) : (
                            <Icon {...getIconProps(filtersStatus === 'error')} />
                        )}
                        <div>
                            <Text className={s.CheckUpdates_element_title_text} type="t1">{translate('filters.filters')}</Text>
                            {(filtersUpdating || !filtersMap)
                                ? (<Text type="t2">{translate('tray.update.check.updates')}</Text>)
                                : (
                                    <>
                                        {filtersStatus === 'nothingToUpdate' && (
                                            <>
                                                <Text type="t2">{translate('up.to.date')}</Text>
                                                <Text type="t2">{format(Date.now(), DATE_FORMAT.day_month_hours_minutes)}</Text>
                                            </>
                                        )}
                                        {filtersStatus === 'updated' && (
                                            <Text type="t2" div>
                                                {translate.plural(
                                                    'tray.update.filters.updated',
                                                    filtersUpdateResult?.status.length || 1,
                                                )}
                                            </Text>
                                        )}
                                        {filtersStatus === 'error' && (
                                            <Text className={s.CheckUpdates_element_title_fix} type="t2" div>
                                                {!filtersUpdateResult?.error
                                                    ? translate('tray.update.filters.update.failed')
                                                    : translate('tray.update.filters.unexpected.error', provideContactSupportParam())}
                                            </Text>
                                        )}
                                    </>
                                )}
                        </div>
                        {filtersHoverable && (
                            <Icon className={s.CheckUpdates_element_arrow} icon="arrow_left" />
                        )}
                    </div>
                    {filtersStatus === 'error' && (
                        <Button className={s.CheckUpdates_element_button} type="outlined" onClick={onFiltersFix}>
                            <Text className={s.CheckUpdates_element_button_text} type="t1">{translate('tray.update.filters.update.try.again')}</Text>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export const CheckUpdates = observer(CheckUpdatesComponent);
