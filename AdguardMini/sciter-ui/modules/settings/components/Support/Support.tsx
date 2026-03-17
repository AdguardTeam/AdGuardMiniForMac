// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { EmptyValue } from 'Apis/types';
import { TDS_PARAMS, getTdsLink } from 'Common/utils/links';
// import { useSettingsStore } from 'Modules/settings/lib/hooks';
import { RouteName } from 'SettingsStore/modules';
import { Layout } from 'UILib';

import { SettingsItemLink } from '../SettingsItem';
import { SettingsTitle } from '../SettingsTitle';

import type { SettingsItemLinkProps } from '../SettingsItem';

const clickHandler = () => {
    window.API.internalService.reportAnIssue(new EmptyValue());
};

/**
 * Settings Support page component
 */
function SupportComponent() {
    // const { settings } = useSettingsStore();

    const navigation: SettingsItemLinkProps[] = [{
        icon: 'send',
        title: translate('support.contact.support'),
        description: translate('support.contact.support.desc'),
        internalLink: RouteName.contact_support,
    }, {
        icon: 'faq',
        title: translate('support.faq'),
        description: translate('support.faq.desc'),
        externalLink: getTdsLink(TDS_PARAMS.faq_safari, RouteName.support),
        linkIcon: 'rightIcon',
    }, {
        icon: 'ads',
        title: translate('support.report'),
        description: `${translate('support.report.desc')}`,
        onClick: clickHandler,
        linkIcon: 'rightIcon',
    }, /* AG-49352 {
        icon: 'message',
        title: translate('support.discuss'),
        description: translate('support.discuss.desc'),
        externalLink: getTdsLink(TDS_PARAMS.discuss, RouteName.support),
        linkIcon: 'rightIcon',
    }, {
        icon: 'star',
        title: translate('support.rate'),
        description: translate('support.rate.desc'),
        onClick: () => {
            if (settings.isMASReleaseVariant) {
                window.API.accountService.RequestOpenAppStoreReview(new EmptyValue());
            } else {
                window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.trustpilot, RouteName.support));
            }
        },
        linkIcon: 'rightIcon',
    } */];

    return (
        <Layout type="settingsPage">
            <SettingsTitle title={translate('menu.support')} maxTopPadding />
            {navigation.map((item) => (
                <SettingsItemLink key={item.icon} {...item} />
            ))}
        </Layout>
    );
}

export const Support = observer(SupportComponent);
