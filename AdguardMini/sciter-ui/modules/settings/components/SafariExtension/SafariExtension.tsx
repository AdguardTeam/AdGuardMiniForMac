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

import { SafariExtensionRow } from './components/SafariExtensionRow';
import { useUpdateSafariExtensions } from './hooks';
import s from './SafariExtension.module.pcss';

/**
 * SafariExtension page in settings module
 */
export function SafariExtensionComponent() {
    const { filtersMeta, router, safariExtensions } = useSettingsStore();

    const {
        general,
        privacy,
        social,
        security,
        other,
        custom,
        adguardForSafari,
    } = safariExtensions.safariExtensions;

    const { filtersGroupedByExtension } = filtersMeta;

    useUpdateSafariExtensions();

    const openSafariPref = (id: string) => {
        window.API.Execute(new OpenSafariExtensionPreferencesRequest({ value: id }));
    };

    const extensions = [
        { extension: general, ids: filtersGroupedByExtension.general, title: 'settings.adg.general', desc: 'settings.adg.general.desc' },
        { extension: privacy, ids: filtersGroupedByExtension.privacy, title: 'settings.adg.privacy', desc: 'settings.adg.privacy.desc' },
        { extension: social, ids: filtersGroupedByExtension.social, title: 'settings.adg.social', desc: 'settings.adg.social.desc' },
        { extension: security, ids: filtersGroupedByExtension.security, title: 'settings.adg.security', desc: 'settings.adg.security.desc' },
        { extension: other, ids: filtersGroupedByExtension.other, title: 'settings.adg.other', desc: 'settings.adg.other.desc' },
        { extension: custom, ids: filtersGroupedByExtension.custom, title: 'settings.adg.custom', desc: 'settings.adg.custom.desc' },
    ];

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
            {extensions.map(({ extension, ids, title, desc }) => (
                <SafariExtensionRow
                    key={extension.id || title}
                    description={translate(desc)}
                    extension={extension}
                    filtersIds={ids}
                    title={translate(title)}
                />
            ))}
            <SettingsItem
                {...{
                    icon: adguardForSafari.status === SafariExtensionStatus.ok ? 'logo_check' : 'info',
                    iconColor: adguardForSafari.status === SafariExtensionStatus.ok ? 'green' : 'orange',
                }}
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
