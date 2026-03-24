// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState, useCallback } from 'preact/hooks';

import { Channel, ReleaseVariants } from 'Apis/types';
import { ADGUARD_MINI_TITLE } from 'Common/utils/consts';
import { TDS_PARAMS, getTdsLink } from 'Common/utils/links';
import { SettingsTitle } from 'Modules/settings/components/SettingsTitle';
import { useSettingsStore } from 'SettingsLib/hooks';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, RouteName } from 'SettingsStore/modules';
import theme from 'Theme';
import { Button, ExternalLink, Icon, Layout, Text } from 'UILib';

import { SettingsItem } from '../SettingsItem/SettingsItem';

import s from './About.module.pcss';

const channelToText = (ch: Channel): string => {
    const texts = {
        [Channel.unknown]: '',
        [Channel.app_store]: 'App Store',
        [Channel.standalone_beta]: 'Beta',
        [Channel.standalone_nightly]: 'Nightly',
        [Channel.standalone_release]: 'Release',
    };
    return texts[ch];
};

/**
 * About page component for settings module
 */
export function AboutComponent() {
    const { appInfo, settings, notification } = useSettingsStore();

    const LINKS = [
        {
            label: translate('about.eula'),
            href: getTdsLink(TDS_PARAMS.eula, RouteName.about),
        },
        {
            label: translate('about.privacy'),
            href: getTdsLink(TDS_PARAMS.privacy, RouteName.about),
        },
        {
            label: translate('about.versions'),
            href: getTdsLink(TDS_PARAMS.github, RouteName.about),
        },
        {
            label: translate('about.acknowledgments'),
            href: getTdsLink(TDS_PARAMS.acknowledgments, RouteName.about),
        },
        {
            label: translate('about.site'),
            href: getTdsLink(TDS_PARAMS.home, RouteName.about),
        },
    ];

    const { newVersionAvailable, appInfo: {
        version,
        channel,
        dependencies,
    } } = appInfo;

    const { settings: {
        releaseVariant,
    } } = settings;

    useEffect(() => {
        if (releaseVariant === ReleaseVariants.standAlone) {
            appInfo.checkApplicationVersion();
        }
    }, [appInfo, releaseVariant]);
    const [showDependencies, setShowDependencies] = useState(false);

    const year = (new Date()).getFullYear();

    const copyVersion = useCallback(() => {
        window.SystemClipboard.writeText(`${ADGUARD_MINI_TITLE} ${version} ${channelToText(channel) ? `(${channelToText(channel)})` : ''}`);

        notification.notify({
            message: translate('about.version.copy.notify'),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.success,
            iconType: NotificationsQueueIconType.done,
            closeable: true,
        });
    }, [version, channel, notification]);

    const copyLibraries = useCallback(() => {
        const libraries = dependencies.map((dep) => `${dep.name} ${dep.version}`).join('\n');
        window.SystemClipboard.writeText(libraries);

        notification.notify({
            message: translate('about.libraries.copy.notify'),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.success,
            iconType: NotificationsQueueIconType.done,
            closeable: true,
        });
    }, [dependencies, notification]);

    // const onClickRateUs = () => {
    //     if (isMASReleaseVariant) {
    //         window.API.accountService.RequestOpenAppStoreReview(new EmptyValue());
    //     } else {
    //         window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.trustpilot, RouteName.support));
    //     }
    // };

    return (
        <Layout type="settingsPage">
            <SettingsTitle title={translate('menu.about')} maxTopPadding />
            <div className={cx(s.About_description, theme.layout.content)}>
                {releaseVariant === ReleaseVariants.standAlone && newVersionAvailable && (
                    <SettingsItem
                        className={s.About_update}
                        icon="update"
                        title={translate('about.update.available', {
                            a: (text: string) => (
                                <div
                                    className={s.About_update_requestUpdate}
                                    onClick={appInfo.requestUpdate}
                                >
                                    {text}
                                </div>
                            ),
                        })}
                        defaultHovered
                        onContainerClick={appInfo.requestUpdate}
                    />
                )}
                <div className={s.About_version}>
                    <Text className={s.About_textSpace} type="h5">
                        {ADGUARD_MINI_TITLE}
                        {' '}
                        {version}
                        {' '}
                        {channelToText(channel) ? `(${channelToText(channel)})` : ''}
                    </Text>
                    <Button
                        className={cx(theme.button.greenIcon, s.About_version_copy)}
                        icon="copy"
                        type="icon"
                        onClick={copyVersion}
                    />
                </div>
                {releaseVariant === ReleaseVariants.standAlone && !newVersionAvailable && (
                    <Text className={s.About_updateSection} type="t1" div>{translate('about.use.last.verion')}</Text>
                )}
                <Text className={s.About_rights} type="t1">{translate('about.rights', { year })}</Text>
                <div className={s.About_dependencies} onClick={() => setShowDependencies(!showDependencies)}>
                    <Text className={s.About_textSpace} type="t1">{translate('about.dependencies')}</Text>
                    <Icon className={showDependencies ? s.About_dependencies_arrow__active : s.About_dependencies_arrow} icon="arrow_left" />
                </div>
                {showDependencies && (
                    <div className={s.About_libraries} onClick={copyLibraries}>
                        {dependencies.map((dep) => (
                            <Text key={dep.name} className={cx(s.About_textSpace, s.About_dependencies_item)} type="t1">
                                {dep.name}
                                {' '}
                                {dep.version}
                            </Text>
                        ))}
                    </div>
                )}
            </div>
            <div className={cx(theme.layout.content, theme.layout.bottomPadding)}>
                {LINKS.map(({ label, href }) => (
                    <ExternalLink
                        key={href}
                        className={cx(s.About_link)}
                        href={href}
                        textType="t1"
                    >
                        {label}
                    </ExternalLink>
                ))}
                {/* AG-49352 <Button className={cx(s.About_link)} type="text" onClick={onClickRateUs}>
                    <Text type="t1">
                        {translate('about.rate.us')}
                    </Text>
                </Button> */}
            </div>
        </Layout>
    );
}

export const About = observer(AboutComponent);
