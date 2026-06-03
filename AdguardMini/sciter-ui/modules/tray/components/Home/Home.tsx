// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { Fragment } from 'preact/jsx-runtime';

import { OpenSettingsWindowRequest } from 'Apis/requests/InternalService';
import theme from 'Theme';
import { useTrayStore } from 'TrayLib/hooks';
import { TrayEvent, TrayRoute } from 'TrayStore/modules';
import { Loader, Logo, Button, Text } from 'UILib';

import { StoryNavigation } from '../../modules/stories/classes';
import { StoriesLayer, StoryCard } from '../../modules/stories/components';
import { FlushCompletedStories } from '../../modules/stories/components/FlushCompletedStories';
import { useStoriesConfig } from '../../modules/stories/hooks';
import { resolveStoryEntryFrame } from '../../modules/stories/utils/navigationBoundary';

import { ProtectionStatus } from './components/ProtectionStatus';
import s from './Home.module.pcss';
import { useExtensionPolling } from './hooks/useExtensionPolling';
import { useStoriesNavigation } from './hooks/useStoriesNavigation';
import { useStoryCarouselScroll } from './hooks/useStoryCarouselScroll';
import { useThemeWithRAF } from './hooks/useThemeWithRAF';

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

    useEffect(() => {
        setIsLoading(settings.getSafariExtensionsLoading());
    }, [settings, settings.safariExtensionsStore.safariExtensions]);

    // Poll extensions while loading
    useExtensionPolling(isLoading, () => settings.getSafariExtensions());

    // Scroll management for stories carousel
    const {
        ref, scrollIsAvailable, handleMoveStoriesCards, handleStoriesCardsScroll,
    } = useStoryCarouselScroll(stories.length);

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
    const isDarkTheme = useThemeWithRAF();

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
