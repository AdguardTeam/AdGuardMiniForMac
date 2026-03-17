// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import noop from 'lodash/noop';

import { OptionalStringValue, EmptyValue, StringValue, SubscriptionMessage, Subscription } from 'Apis/types';
import { provideTrialDaysParam } from 'Common/utils/translate';
import { getTdsLink, TDS_PARAMS } from 'Modules/common/utils/links';
// import { StarStoryMainFrameButtons } from 'Modules/tray/modules/stories/components/StarStoryMainFrameButtons';
import { TrayEvent } from 'Modules/tray/store/modules';
import { RouteName as RouteNameSettings } from 'SettingsStore/modules/SettingsRouter';
import { useTrayStore } from 'TrayLib/hooks';
import { ExternalLink } from 'UILib';

import { telemetryStoryFrameButtonsWrapper } from '../components';

import type { IStoryFrame, StoryInfo } from '../model';

const openSafariPref = () => {
    window.API.settingsService.OpenSafariExtensionPreferences(new OptionalStringValue());
};

const openLoginItemsSettings = () => {
    window.API.settingsService.OpenLoginItemsSettings(new EmptyValue());
};

/**
 * "From" component value for TDS links
 */
const STORIES_TDS_LINK_FROM = 'storyConstructor';

/**
 * Hook that returns stories config
 * Implements logic for sorting and filtering stories
 */
export function useStoriesConfig(): StoryInfo[] {
    const { settings } = useTrayStore();

    const requiredStories: StoryInfo[] = [];
    const stories: StoryInfo[] = [];

    const {
        settings: traySettings,
        loginItemEnabled,
        isLicenseOrTrialActive,
        isLicenseBind,
        isLicenseActive,
        trialAvailableDays,
        storyCompleted,
        advancedBlocking,
        license,
    } = settings;

    const { allExtensionEnabled, allowTelemetry } = traySettings || {};

    if (!allExtensionEnabled) {
        requiredStories.push({
            warning: true,
            icon: 'info',
            text: translate('tray.story.adguard.extensions'),
            storyConfig: {
                id: 'extensions',
                frames: [
                    {
                        title: translate('tray.story.adguard.extensions'),
                        description: translate('tray.story.adguard.extensions.desc'),
                        image: 'extensions',
                        actionButton: {
                            title: translate('tray.story.adguard.extensions.action'),
                            action: openSafariPref,
                        },
                        frameId: 'extensions1',
                    },
                ],
                backgroundColor: 'aqua',
            },
            telemetryEvent: TrayEvent.StoryEnableExtensionsClick,
        });
    }

    if (!loginItemEnabled) {
        requiredStories.push({
            warning: true,
            icon: 'info',
            text: translate('tray.story.login.item'),
            storyConfig: {
                id: 'loginItem',
                frames: [
                    {
                        title: translate('tray.story.login.item'),
                        description: translate('tray.story.login.item.desc', { b: (text: string) => (<span style={{ color: 'inherit !important', fontWeight: '600' }}>{text}</span>) }),
                        image: 'loginItem',
                        actionButton: {
                            title: translate('tray.story.login.item.action'),
                            action: openLoginItemsSettings,
                        },
                        frameId: 'loginItem1',
                    },
                ],
                backgroundColor: 'purple',
            },
        });
    }

    if (settings.settings?.recentlyMigrated) {
        stories.push({
            icon: 'adguard',
            text: translate('tray.story.meetAGMini.card'),
            storyConfig: {
                id: 'meetAGMini',
                frames: [{
                    title: translate('tray.story.meetAGMini.card.title'),
                    description: translate('tray.story.meetAGMini.card.desc'),
                    image: 'ag_mini_mac_release_blogpost',
                    frameId: 'meetAGMini1',
                    actionButton: {
                        title: translate('tray.story.meetAGMini.card.action'),
                        action: () => window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.ag_mini_mac_release_blogpost)),
                    },
                }],
                backgroundColor: 'green',
            },
        });
    }

    if (!isLicenseOrTrialActive) {
        stories.push({
            icon: 'quality',
            text: translate('tray.story.advanced.features'),
            storyConfig: {
                id: 'advanced',
                frames: [{
                    title: translate('tray.story.advanced.features'),
                    description: translate('tray.story.advanced.features.desc'),
                    image: 'advanced',
                    actionButton: {
                        title: trialAvailableDays > 0 ? translate.plural('tray.story.advanced.features.action.trial', trialAvailableDays, provideTrialDaysParam(trialAvailableDays)) : translate('tray.story.advanced.features.action'),
                        action: settings.requestOpenPaywallScreen,
                    },
                    frameId: 'advanced1',
                }],
                backgroundColor: 'green',
            },
            telemetryEvent: TrayEvent.StoryUnlockFeaturesClick,
        });
    }

    if (!isLicenseBind && isLicenseActive) {
        stories.push({
            icon: 'phone',
            text: translate('tray.story.other.devices'),
            storyConfig: {
                id: 'devices',
                frames: [{
                    title: translate('tray.story.other.devices'),
                    description: translate('tray.story.other.devices.desc'),
                    image: 'devices',
                    actionButton: {
                        title: translate('tray.story.other.devices.action'),
                        action: () => {
                            window.API.internalService.OpenSettingsWindow(new EmptyValue());
                            window.API.settingsService.RequestOpenSettingsPage(new StringValue({
                                value: RouteNameSettings.license,
                            }));
                        },
                    },
                    frameId: 'devices1',
                }],
                backgroundColor: 'emerald',
            },
            telemetryEvent: TrayEvent.StoreUseLicenseClick,
        });
    }

    if (!allowTelemetry) {
        stories.push({
            icon: 'rocket',
            text: translate('telemetry.story.title'),
            storyConfig: {
                id: 'telemetry',
                totalFrames: 3,
                onBeforeClose: () => {
                    settings.getSettings();
                },
                frames: [{
                    frameId: 'telemetry1',
                    title: translate('telemetry.story.frame.1.title'),
                    description: translate('telemetry.story.frame.1.desc'),
                    image: 'telemetry1',
                    component: telemetryStoryFrameButtonsWrapper(true),
                }, {
                    frameId: 'telemetry2',
                    title: translate('telemetry.story.frame.2.title'),
                    description: translate('telemetry.story.frame.2.desc', { link: (text: string) => <ExternalLink color="inheritColor" href={getTdsLink(TDS_PARAMS.privacy)}>{text}</ExternalLink> }),
                    image: 'extra1',
                    component: telemetryStoryFrameButtonsWrapper(false),
                }, {
                    frameId: 'telemetry3',
                    title: translate('telemetry.story.frame.3.title'),
                    description: translate('telemetry.story.frame.3.desc'),
                    image: 'telemetry3',
                    actionButton: {
                        title: translate('telemetry.story.frame.button.settings'),
                        action: () => {
                            window.API.internalService.OpenSettingsWindow(new EmptyValue());
                            window.API.settingsService.RequestOpenSettingsPage(new StringValue({
                                value: RouteNameSettings.settings,
                            }));
                        },
                    },
                }, {
                    frameId: 'telemetry4',
                    title: translate('telemetry.story.frame.4.title'),
                    description: translate('telemetry.story.frame.4.desc'),
                    image: 'telemetry4',
                }],
                backgroundColor: 'sandBlue',
            },
            telemetryEvent: TrayEvent.TelemetryClick,
        });
    }

    stories.push({
        icon: 'custom_filter',
        text: translate('tray.story.filters'),
        storyConfig: {
            id: 'filters',
            frames: [{
                title: translate('tray.story.filters'),
                description: translate('tray.story.filters.desc.1'),
                image: 'filters1',
                frameId: 'filters1',
            }, {
                title: translate('tray.story.filters.title.2'),
                description: translate('tray.story.filters.desc.2'),
                image: 'filters2',
                frameId: 'filters2',
            }, {
                title: translate('tray.story.filters.title.3'),
                description: translate('tray.story.filters.desc.3'),
                image: 'filters3',
                frameId: 'filters3',
            }, {
                title: translate('tray.story.filters.title.4'),
                description: translate('tray.story.filters.desc.4', { i: (text: string) => <i id="tray.story.filters.desc.4">{text}</i> }),
                image: 'filters4',
                frameId: 'filters4',
            }, {
                title: translate('tray.story.filters.title.5'),
                description: translate('tray.story.filters.desc.5'),
                image: 'filters5',
                actionButton: {
                    title: translate('tray.story.filters.action.5'),
                    action: () => {
                        window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.what_filters, STORIES_TDS_LINK_FROM));
                    },
                },
                frameId: 'filters5',
            }],
            backgroundColor: 'blue',
        },
        telemetryEvent: TrayEvent.StoryWhatFilterClick,
    });

    // AG-49352 stories.push({
    //     icon: 'star',
    //     text: translate('tray.story.rate.adguard'),
    //     storyConfig: {
    //         id: 'rate',
    //         frames: [{
    //             title: translate('tray.story.rate.adguard'),
    //             description: translate('tray.story.rate.adguard.desc'),
    //             image: 'rate1',
    //             component: StarStoryMainFrameButtons,
    //             frameId: 'rate1',
    //         }],
    //         backgroundColor: 'sandBlue',
    //     },
    //     telemetryEvent: TrayEvent.StoryLoveHearYouClick,
    // });


    const extraFrames: IStoryFrame[] = [
        {
            title: translate('tray.story.adguard.extra'),
            description: translate('tray.story.adguard.extra.desc'),
            image: 'extra1',
            frameId: 'extra1',
        }, {
            title: translate('tray.story.adguard.extra.title.2'),
            description: translate('tray.story.adguard.extra.desc.2'),
            image: 'extra2',
            frameId: 'extra2',
        },
    ];

    let extraTitle = '';
    let extraDescription = '';
    let extraButtonTitle = '';
    let extraButtonAction = noop;
    if (trialAvailableDays > 0) {
        extraTitle = translate('tray.story.adguard.extra.title.3');
        extraDescription = translate('tray.story.adguard.extra.desc.3');
        extraButtonTitle = translate.plural('tray.story.adguard.extra.action.3.trial', trialAvailableDays, provideTrialDaysParam(trialAvailableDays));
        extraButtonAction = () => {
            window.API.internalService.OpenSettingsWindow(new EmptyValue());
            window.API.settingsService.RequestOpenSettingsPage(new StringValue({
                value: RouteNameSettings.license,
            }));
        };
    }
    if (isLicenseOrTrialActive) {
        extraTitle = translate('tray.story.adguard.extra.title.4');
        extraDescription = translate('tray.story.adguard.extra.desc.4');
        extraButtonTitle = translate('tray.story.adguard.extra.action.4');
        extraButtonAction = () => {
            window.API.internalService.OpenSettingsWindow(new EmptyValue());
            window.API.settingsService.RequestOpenSettingsPage(new StringValue({
                value: RouteNameSettings.advanced_blocking,
            }));
        };
    }

    if (!trialAvailableDays && !isLicenseOrTrialActive) {
        extraTitle = translate('tray.story.adguard.extra.title.3');
        extraDescription = translate('tray.story.adguard.extra.desc.3');
        extraButtonTitle = translate('tray.story.adguard.extra.action.3');
        extraButtonAction = () => {
            window.API.internalService.OpenSettingsWindow(new EmptyValue());
            window.API.settingsService.RequestOpenSettingsPage(new StringValue({
                value: RouteNameSettings.license,
            }));
            if (license.license?.appStoreSubscription || (settings.isMASReleaseVariant)) {
                settings.requestOpenPaywallScreen();
            } else {
                API.accountService.RequestSubscribe(
                    new SubscriptionMessage({ subscriptionType: Subscription.standalone }),
                );
            }
        };
    }

    /*
        Last frame should be show in cases:
            1) User has no license or trial
            2) User has any license, but extra is disabled
    */
    const lastExtraScreenShouldBeShown = !isLicenseOrTrialActive
        || (isLicenseOrTrialActive && !advancedBlocking?.adguardExtra);

    if (lastExtraScreenShouldBeShown) {
        extraFrames.push({
            title: extraTitle,
            description: extraDescription,
            image: 'extra3',
            actionButton: {
                title: extraButtonTitle,
                action: extraButtonAction,
            },
            frameId: 'extra3',
        });
    }

    stories.push({
        icon: 'advanced',
        text: translate('tray.story.adguard.extra'),
        storyConfig: {
            id: 'extra',
            frames: extraFrames,
            backgroundColor: 'sand',
        },
        telemetryEvent: TrayEvent.StoryWhatIsExtraClick,
    });

    stories.sort((a) => {
        if (storyCompleted.has(a.storyConfig?.id)) {
            return 1;
        }
        return 0;
    });

    return [...requiredStories, ...stories];
}
