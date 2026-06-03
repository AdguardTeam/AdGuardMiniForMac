// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { clamp } from '@adg/sciter-utils-kit';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Fragment } from 'preact/jsx-runtime';

import { OpenSettingsWindowRequest } from 'Apis/requests/InternalService';
import theme from 'Theme';
import { useTheme, useTrayStore } from 'TrayLib/hooks';
import { TrayEvent, TrayRoute } from 'TrayStore/modules';
import { Loader, Logo, Button, Text } from 'UILib';
import { isDarkColorTheme } from 'Utils/colorThemes';

import { StoryNavigation } from '../../modules/stories/classes';
import { StoriesLayer, StoryCard } from '../../modules/stories/components';
import { FlushCompletedStories } from '../../modules/stories/components/FlushCompletedStories';
import { useStoriesConfig } from '../../modules/stories/hooks';
import { resolveStoryEntryFrame } from '../../modules/stories/utils/navigationBoundary';

import { ProtectionStatus } from './components/ProtectionStatus';
import s from './Home.module.pcss';
import { useStoriesNavigation } from './hooks/useStoriesNavigation';

const STORIES_CONTAINER_WIDTH = 344;
const STORY_SWITCH_INTERACTABLE_AREA_WIDTH = 156;

/**
 * Home screen of tray
 */
function HomeComponent() {
    const trayStore = useTrayStore();
    const { settings, router, trayWindowVisibilityChanged, telemetry } = trayStore;
    const { settings: traySettings } = settings;

    const stories = useStoriesConfig();
    const {
        selectedStoryId,
        storyEntryMode,
        storiesById,
        openStory,
        moveToNextStory,
        moveToPreviousStory,
        closeStories,
        getAdjacentStoryId,
    } = useStoriesNavigation(stories);

    const [isLoading, setIsLoading] = useState(false);
    const [isDarkTheme, setIsDarkTheme] = useState(false);

    useEffect(() => {
        setIsLoading(settings.getSafariExtensionsLoading());
    }, [settings, settings.safariExtensionsStore.safariExtensions]);

    // Poll extensions while loading
    useEffect(() => {
        if (!isLoading) {
            return;
        }
        let rafId: number;
        let lastCallTime = Date.now();
        /**
         *
         */
        function loop() {
            if (!isLoading) {
                return;
            }
            if (Date.now() - lastCallTime >= 1000) {
                settings.getSafariExtensions();
                lastCallTime = Date.now();
            }
            rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [isLoading, settings]);

    // Scroll management for stories carousel
    const ref = useRef<HTMLDivElement>(null);
    const [scrollIsAvailable, setScrollIsAvailable] = useState({ left: false, right: stories.length > 2 });

    const handleMoveStoriesCards = useCallback((e?: MouseEvent) => {
        const direction = (e?.target as HTMLButtonElement)?.getAttribute('data-switch-direction');
        if (!ref.current || !direction) {
            return;
        }
        const scrollDelta = direction === 'left'
            ? -STORY_SWITCH_INTERACTABLE_AREA_WIDTH
            : STORY_SWITCH_INTERACTABLE_AREA_WIDTH;
        const position = clamp(
            ref.current.scrollLeft + scrollDelta,
            0, ref.current.scrollWidth - STORIES_CONTAINER_WIDTH,
        );
        const newLeft = position > 0;
        const newRight = position < ref.current.scrollWidth - STORIES_CONTAINER_WIDTH;
        setScrollIsAvailable({ left: newLeft, right: newRight });
        ref.current.scrollTo({ left: position, behavior: 'smooth' });
    }, []);

    const handleStoriesCardsScroll = useCallback((e: UIEvent) => {
        const target = e.target as HTMLDivElement;
        const maxScroll = target.scrollWidth - STORIES_CONTAINER_WIDTH;
        setScrollIsAvailable({
            left: target.scrollLeft > 0,
            right: target.scrollLeft < maxScroll,
        });
    }, []);

    const openSettingsWindow = useCallback(() => {
        window.API.Execute(new OpenSettingsWindowRequest());
        telemetry.trackEvent(TrayEvent.SettingsClick);
    }, [telemetry]);

    const navigateToUpdates = useCallback(() => {
        telemetry.trackEvent(TrayEvent.UpdateClick);
        router.changePath(TrayRoute.updates);
    }, [router, telemetry]);

    useEffect(() => {
        return trayWindowVisibilityChanged.addEventListener((visible) => {
            if (!visible) {
                closeStories();
            }
        });
    }, [closeStories, trayWindowVisibilityChanged]);

    // Theme handling with RAF workaround for sciter render bug
    const rafRef = useRef<number | null>(null);
    useTheme((th) => {
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
            document.documentElement.setAttribute('theme', th);
        });
        setIsDarkTheme(isDarkColorTheme(th));
    });

    if (!traySettings) {
        return <Loader className={s.Home_loader} large />;
    }

    const currentStoryConfig = selectedStoryId !== null ? storiesById.get(selectedStoryId) : undefined;
    const currentStory = currentStoryConfig ? new StoryNavigation(currentStoryConfig) : undefined;
    if (currentStory && storyEntryMode === 'last') {
        currentStory.setIndex(resolveStoryEntryFrame(currentStory.length, 'last'));
    }

    return (
        <Fragment>
            {currentStory && (
                <FlushCompletedStories currentStory={currentStory}>
                    {({ addCompletedStory }) => (
                        <StoriesLayer
                            key={currentStory!.id}
                            addCompletedStory={addCompletedStory}
                            closeStories={closeStories}
                            hasPreviousStory={getAdjacentStoryId(-1) !== null}
                            isMASReleaseVariant={settings.isMASReleaseVariant}
                            moveToNextStory={moveToNextStory}
                            moveToPreviousStory={moveToPreviousStory}
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
                <ProtectionStatus isLoading={isLoading} />
                {stories.length > 0 && (
                    <>
                        <div className={s.Home_storiesControls}>
                            <Text className={s.Home_storiesControls_title} type="t2">
                                {translate('tray.home.stories.title')}
                            </Text>
                            {stories.length > 2 && (
                                <>
                                    {(['left', 'right'] as const).map((direction) => (
                                        <Button
                                            key={direction}
                                            className={cx(
                                                s.Home_storiesControls_button,
                                                direction === 'right' && s.Home_storiesControls_button__right,
                                            )}
                                            data-switch-direction={direction}
                                            icon="arrow_left"
                                            iconClassName={
                                                !scrollIsAvailable[direction]
                                                    ? s.Home_storiesControls_button__disabled
                                                    : theme.button.grayIcon
                                            }
                                            type="icon"
                                            onClick={handleMoveStoriesCards}
                                        />
                                    ))}
                                </>
                            )}
                        </div>
                        <div ref={ref} className={s.Home_stories} onScroll={handleStoriesCardsScroll}>
                            <div className={s.Home_stories_container}>
                                {stories.map((props) => (
                                    <StoryCard
                                        {...props}
                                        key={props.storyConfig.id}
                                        setSelectedStoryId={openStory}
                                        storyId={props.storyConfig.id}
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
