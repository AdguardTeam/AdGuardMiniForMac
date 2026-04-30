// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { OpenSafariExtensionPreferencesRequest } from 'Apis/requests/SettingsService';
import { SafariExtensionStatus } from 'Apis/types';
import { TDS_PARAMS, getTdsLink } from 'Common/utils/links';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import {
    Layout,
    Text,
    ExternalLink,
} from 'UILib';

import { SettingsItem } from '../SettingsItem';
import { SettingsTitle } from '../SettingsTitle';

import { useUpdateSafariExtensions } from './hooks';
import s from './SafariExtension.module.pcss';

import type { SettingsItemProps } from '../SettingsItem';
import type { SafariExtension as SafariExtensionEnt } from 'Apis/types';

/**
 * Returns Icon that is describes safari extension status
 * @param status - Safari extension status
 * @returns Icon component
 */
const iconFromStatus = (status: SafariExtensionStatus): Pick<SettingsItemProps, 'icon' | 'iconColor' | 'iconRotate'> => {
    switch (status) {
        case SafariExtensionStatus.unknown:
            return { icon: 'info', iconColor: 'red' };
        case SafariExtensionStatus.ok:
            return { icon: 'logo_check', iconColor: 'green' };
        case SafariExtensionStatus.loading:
            return { icon: 'loading', iconColor: 'green', iconRotate: true };
        case SafariExtensionStatus.disabled:
            return { icon: 'info', iconColor: 'orange' };
        case SafariExtensionStatus.limit_exceeded:
        case SafariExtensionStatus.converter_error:
        case SafariExtensionStatus.safari_error:
            return { icon: 'info', iconColor: 'red' };
    }
};

/**
 * Safari extensions statuses arrays, used for showing "Something wrong" message
 */
const smthWrongErrors = [
    SafariExtensionStatus.unknown,
    SafariExtensionStatus.limit_exceeded,
    SafariExtensionStatus.converter_error,
    SafariExtensionStatus.safari_error,
];

/**
 * SafariExtension page in settings module
 */
export function SafariExtensionComponent() {
    const { settings, filters, router } = useSettingsStore();
    const { safariExtensionsStore, contentBlockersRulesLimit } = settings;

    const {
        general,
        privacy,
        social,
        security,
        other,
        custom,
        adguardForSafari,
    } = safariExtensionsStore.safariExtensions;

    const { filtersGroupedByExtension, filtersMap } = filters;

    // Update data on window focus
    useUpdateSafariExtensions();

    const openSafariPref = (id: string) => {
        window.API.Execute(new OpenSafariExtensionPreferencesRequest({ value: id }));
    };

    const getInfoTextFromStatus = (extension: SafariExtensionEnt, filtersIds: number[]) => {
        const name = filtersIds.map((id) => filtersMap.get(id)?.title).filter((v) => !!v).slice(0, 3).join(', ');
        return (
            <>
                <Text className={cx(s.SafariExtension_rules, extension.status === SafariExtensionStatus.limit_exceeded && s.SafariExtension_rules__red)} type="t2">
                    {/* FIXME: Bug in sciter 6.0.2.16-rev-1
                    If <b> tag isn't wrapped, its color, weight, font-family are unset */}
                    <div>
                        {translate('settings.rules.count', { rules: Math.max(extension.rulesEnabled, 0), total: contentBlockersRulesLimit })}
                    </div>
                </Text>
                <Text className={cx(s.SafariExtension_rules)} type="t2">
                    {filtersIds.length > 0
                        ? (
                            // FIXME: Bug in sciter 6.0.2.16-rev-1
                            // If <b> tag isn't wrapped, its color, font-weight, font-family are unset
                            <div>
                                {translate('settings.filter.enabled.names')}
                                {' '}
                                <b>
                                    {name}
                                    {' '}
                                    {filtersIds.length > 4 ? translate('and.more', { value: filtersIds.length - 4 }) : ''}
                                </b>
                            </div>
                        )
                        : translate('settings.no.filters.enabled')}
                </Text>
                {extension.status === SafariExtensionStatus.disabled && (
                    <Text className={cx(s.SafariExtension_rules, s.SafariExtension_rules__orange)} type="t2" div>
                        {translate('settings.disabled.fix', { nav: (text: string) => (<div className={s.SafariExtension_rules_link} onClick={() => openSafariPref(extension.id)}>{text}</div>) })}
                    </Text>
                )}
                {extension.status === SafariExtensionStatus.limit_exceeded && (
                    <Text className={cx(s.SafariExtension_rules, s.SafariExtension_rules__red)} type="t2" div>
                        {translate('settings.rule.limit.exceeded', { nav: (text: string) => (<div className={s.SafariExtension_rules_link} onClick={() => router.changePath(RouteName.filters, { filtersIds, backLink: RouteName.safari_extensions })}>{text}</div>) })}
                    </Text>
                )}
                {smthWrongErrors.includes(extension.status) && (
                    <Text className={cx(s.SafariExtension_rules, s.SafariExtension_rules__red)} type="t2">
                        {translate('settings.converter.error')}
                    </Text>
                )}
            </>
        );
    };

    return (
        <Layout navigation={{ router, route: RouteName.settings, title: translate('menu.settings') }} type="settingsPage">
            <SettingsTitle
                description={translate('settings.safari.ext.desc')}
                title={translate('settings.safari.ext')}
            >
                <ExternalLink
                    className={s.SafariExtension_link}
                    href={getTdsLink(TDS_PARAMS.what_is_extensions, RouteName.safari_extensions)}
                    textType="t1"
                    noUnderline
                >
                    {translate('settings.safari.ext.info')}
                </ExternalLink>
            </SettingsTitle>
            <SettingsItem
                {...iconFromStatus(general.status)}
                additionalText={getInfoTextFromStatus(general, filtersGroupedByExtension.general)}
                contentClassName={s.SafariExtension_settings}
                description={translate('settings.adg.general.desc')}
                title={translate('settings.adg.general')}
            />
            <SettingsItem
                {...iconFromStatus(privacy.status)}
                additionalText={getInfoTextFromStatus(privacy, filtersGroupedByExtension.privacy)}
                contentClassName={s.SafariExtension_settings}
                description={translate('settings.adg.privacy.desc')}
                title={translate('settings.adg.privacy')}
            />
            <SettingsItem
                {...iconFromStatus(social.status)}
                additionalText={getInfoTextFromStatus(social, filtersGroupedByExtension.social)}
                contentClassName={s.SafariExtension_settings}
                description={translate('settings.adg.social.desc')}
                title={translate('settings.adg.social')}
            />
            <SettingsItem
                {...iconFromStatus(security.status)}
                additionalText={getInfoTextFromStatus(security, filtersGroupedByExtension.security)}
                contentClassName={s.SafariExtension_settings}
                description={translate('settings.adg.security.desc')}
                title={translate('settings.adg.security')}
            />
            <SettingsItem
                {...iconFromStatus(other.status)}
                additionalText={getInfoTextFromStatus(other, filtersGroupedByExtension.other)}
                contentClassName={s.SafariExtension_settings}
                description={translate('settings.adg.other.desc')}
                title={translate('settings.adg.other')}
            />
            <SettingsItem
                {...iconFromStatus(custom.status)}
                additionalText={getInfoTextFromStatus(custom, filtersGroupedByExtension.custom)}
                contentClassName={s.SafariExtension_settings}
                description={translate('settings.adg.custom.desc')}
                title={translate('settings.adg.custom')}
            />
            <SettingsItem
                {...iconFromStatus(adguardForSafari.status)}
                additionalText={adguardForSafari.status === SafariExtensionStatus.disabled && (
                    <Text className={cx(s.SafariExtension_rules, s.SafariExtension_rules__orange)} type="t2" div>
                        {translate('settings.disabled.fix', { nav: (text: string) => (<div className={s.SafariExtension_rules_link} onClick={() => openSafariPref(adguardForSafari.id)}>{text}</div>) })}
                    </Text>
                )}
                contentClassName={s.SafariExtension_settings}
                description={translate('settings.adg.for.safari.desc')}
                title={translate('settings.adg.for.safari')}
            />
        </Layout>
    );
}

export const SafariExtension = observer(SafariExtensionComponent);
