// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { clamp } from '@adg/sciter-utils-kit';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Fragment } from 'preact/jsx-runtime';

import { EmptyValue, OptionalStringValue } from 'Apis/types';
import { getCountableEntityStatuses } from 'Common/utils/utils';
import theme from 'Theme';
import { useTheme, useTrayStore } from 'TrayLib/hooks';
import { TrayEvent, TrayRoute } from 'TrayStore/modules';
import { Loader, Logo, Button, Text, Switch } from 'UILib';
import { isDarkColorTheme } from 'Utils/colorThemes';

import { StoryNavigation } from '../../modules/stories/classes';
import { StoriesLayer, StoryCard } from '../../modules/stories/components';
import { FlushCompletedStories } from '../../modules/stories/components/FlushCompletedStories';
import { useStoriesConfig } from '../../modules/stories/hooks';

import s from './Home.module.pcss';

const STORIES_CONTAINER_WIDTH = 344;
const STORY_SWITCH_INTERACTABLE_AREA_WIDTH = 156;

/**
 * Opens Safari preferences window
 */
const openSafariPreferences = () => {
    window.API.settingsService.OpenSafariExtensionPreferences(new OptionalStringValue());
};

/**
 * Home screen of tray
 */
function HomeComponent() {
    const trayStore = useTrayStore();
    const { settings, router, trayWindowVisibilityChanged, telemetry } = trayStore;
    const { settings: traySettings } = settings;

    const stories = useStoriesConfig();
    const [storyIndex, setStoryIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const moveToNextStory = useCallback(() => setStoryIndex((prev) => prev + 1), []);
    const closeStories = useCallback(() => setStoryIndex(-1), []);

    const [isDarkTheme, setIsDarkTheme] = useState(false);

    useEffect(() => {
        const exts = settings.getSafariExtensionsLoading();
        setIsLoading(exts.length > 0);
    }, [settings.safariExtensions]);

    /**
     * Fix for Home component to fix infinite convertation status
     */
    useEffect(() => {
        let rafId: number | undefined;
        let lastCallTime = Date.now();

        /**
         * Function to update safari extensions in RAF
         * There is some unexpected behavior with Safari extensions status
         */
        function loop() {
            if (!isLoading) {
                return;
            }
            const now = Date.now();
            if (now - lastCallTime >= 1000) {
                settings.getSafariExtensions();
                lastCallTime = now;
            }
            rafId = requestAnimationFrame(loop);
        }

        if (isLoading) {
            rafId = requestAnimationFrame(loop);
        }

        return () => {
            if (rafId !== undefined) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [isLoading, settings]);

    const ref = useRef<HTMLDivElement>(null);

    const [scrollIsAvailable, setScrollIsAvailable] = useState({
        left: false,
        right: stories.length > 2,
    });

    const openSettingsWindow = useCallback(() => {
        API.internalService.OpenSettingsWindow(new EmptyValue());
        telemetry.trackEvent(TrayEvent.SettingsClick);
    }, [telemetry]);

    const handleToggleSwitch = useCallback((checked: boolean) => {
        settings.updateSettings(checked);
        telemetry.trackEvent(TrayEvent.MainProtectionClick);
    }, [settings, telemetry]);

    const navigateToUpdates = useCallback(() => router.changePath(TrayRoute.updates), [router]);

    /**
     * Handle click on arrows in stories cards box
     */
    const handleMoveStoriesCards = useCallback((e?: MouseEvent) => {
        // Sciter does not support dataset
        const direction = (e?.target as HTMLButtonElement)?.getAttribute('data-switch-direction');

        if (!ref.current || !direction) {
            return;
        }

        const position = clamp(
            ref.current.scrollLeft + (direction === 'left' ? -STORY_SWITCH_INTERACTABLE_AREA_WIDTH : STORY_SWITCH_INTERACTABLE_AREA_WIDTH),
            0,
            ref.current.scrollWidth - STORIES_CONTAINER_WIDTH,
        );

        setScrollIsAvailable({
            left: position > 0,
            right: position < ref.current.scrollWidth - STORIES_CONTAINER_WIDTH,
        });

        ref.current.scrollTo({ left: position, behavior: 'smooth' });
    }, []);

    const handleStoriesCardsScroll = useCallback((e: UIEvent) => {
        const target = e.target as HTMLDivElement;

        setScrollIsAvailable({
            left: target.scrollLeft > 0,
            right: target.scrollLeft < target.scrollWidth - STORIES_CONTAINER_WIDTH,
        });
    }, []);

    useEffect(() => {
        return trayWindowVisibilityChanged.addEventListener((visible) => {
            if (!visible) {
                closeStories();
            }
        });
    }, [closeStories]);

    const rafRef = useRef<number | null>(null);
    useTheme((th) => {
        // We have to change theme attribute in next frame to fix bug with no rerender from sciter
        // This probably happens because sciter doesn't see changes in theme attribute
        // TODO: AG-51217 remove this when sciter will be fixed
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
            document.documentElement.setAttribute('theme', th);
        });
        setIsDarkTheme(isDarkColorTheme(th));
    });

    if (!traySettings) {
        return (
            <Loader className={s.Home_loader} large />
        );
    }

    const { enabled } = traySettings;

    const {
        allDisabled: allExtensionsDisabled,
        someDisabled: someExtensionsDisabled,
        allEnabled: allExtensionsEnabled,
    } = getCountableEntityStatuses(settings.enabledSafariExtensionsCount, settings.safariExtensionsCount);

    const getDisabledExtensionsStatus = () => {
        if (someExtensionsDisabled) {
            return translate('tray.home.title.protection.extensions.disabled', {
                link: (text: string) => {
                    return (
                        <div
                            onClick={() => {
                                telemetry.trackEvent(TrayEvent.FixItClick);
                                openSafariPreferences();
                            }}
                        >
                            {text}
                        </div>
                    );
                },
            });
        }

        if (allExtensionsDisabled) {
            return translate('tray.home.title.protection.extensions.all.disabled', {
                link: (text: string) => (<div onClick={openSafariPreferences}>{text}</div>),
            });
        }
    };

    const currentStory = stories[storyIndex]?.storyConfig
        ? new StoryNavigation(stories[storyIndex]?.storyConfig) : undefined;

    return (
        <Fragment>
            {currentStory && (
                <FlushCompletedStories currentStory={currentStory}>
                    {({ addCompletedStory }) => (
                        <StoriesLayer
                            key={currentStory!.id}
                            addCompletedStory={addCompletedStory}
                            closeStories={closeStories}
                            isMASReleaseVariant={settings.isMASReleaseVariant}
                            moveToNextStory={moveToNextStory}
                            story={currentStory!}
                        />
                    )}
                </FlushCompletedStories>
            )}
            <div className={s.Home}>
                <div className={s.Home_header}>
                    <Logo className={s.Home_header_logo} isDarkTheme={isDarkTheme} />
                    <Button
                        className={cx(theme.button.greenIcon, s.Home_header_update)}
                        icon="update"
                        type="icon"
                        onClick={navigateToUpdates}
                    />
                    <Button
                        className={theme.button.greenIcon}
                        icon="settings"
                        type="icon"
                        onClick={openSettingsWindow}
                    />
                </div>
                {isLoading ? (
                    <>
                        <Text className={s.Home_title} type="h4">
                            {translate('tray.home.title.converting')}
                        </Text>
                        <Text className={cx(s.Home_status)} type="t2">
                            {translate('tray.home.title.converting.desc')}
                        </Text>
                    </>
                ) : (
                    <>
                        <Text className={s.Home_title} type="h4">
                            {enabled ? translate('tray.home.title.protection.enabled') : translate('tray.home.title.protection.disabled')}
                        </Text>
                        <Text className={cx(s.Home_status, !allExtensionsEnabled && s.Home_extensionsDisabled)} type="t2" div>
                            {allExtensionsEnabled && (enabled ? translate('tray.home.title.protection.enabled.desc') : translate('tray.home.title.protection.disabled.desc'))}
                            {getDisabledExtensionsStatus()}
                        </Text>
                    </>
                )}
                <Switch
                    checked={enabled}
                    className={s.Home_switch}
                    icon
                    onChange={handleToggleSwitch}
                />
                {stories.length > 0 && (
                    <>
                        <div className={s.Home_storiesControls}>
                            <Text className={s.Home_storiesControls_title} type="t2">
                                {translate('tray.home.stories.title')}
                            </Text>
                            {stories.length > 2 && (
                                <>
                                    <Button
                                        className={s.Home_storiesControls_button}
                                        data-switch-direction="left"
                                        icon="arrow_left"
                                        iconClassName={!scrollIsAvailable.left
                                            ? s.Home_storiesControls_button__disabled : theme.button.grayIcon}
                                        type="icon"
                                        onClick={handleMoveStoriesCards}
                                    />
                                    <Button
                                        className={cx(
                                            s.Home_storiesControls_button,
                                            s.Home_storiesControls_button__right,
                                        )}
                                        data-switch-direction="right"
                                        icon="arrow_left"
                                        iconClassName={!scrollIsAvailable.right
                                            ? s.Home_storiesControls_button__disabled : theme.button.grayIcon}
                                        type="icon"
                                        onClick={handleMoveStoriesCards}
                                    />
                                </>
                            )}
                        </div>
                        <div
                            ref={ref}
                            className={s.Home_stories}
                            onScroll={handleStoriesCardsScroll}
                        >
                            <div className={s.Home_stories_container}>
                                {stories.map((props, index) => (
                                    <StoryCard
                                        {...props}
                                        key={props.storyConfig.id}
                                        setSelectedStoryIndex={setStoryIndex}
                                        storyIndex={index}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Fragment>
    );
}

export const Home = observer(HomeComponent);
