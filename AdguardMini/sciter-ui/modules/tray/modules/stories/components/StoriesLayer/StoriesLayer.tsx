// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useRef, useReducer, useEffect } from 'preact/hooks';

import { actions, navigationReducer } from 'Modules/tray/modules/stories/reducers';

import { FrameContent, NavigationArrows, ProgressBarGroup, STORY_ANIMATION_DURATION } from '..';

import s from './StoriesLayer.module.pcss';

import type { StoryNavigation } from 'Modules/tray/modules/stories/classes';
import type { StoryId } from 'Modules/tray/modules/stories/model';

type StoriesLayerProps = {
    story: StoryNavigation;
    moveToNextStory(): void;
    closeStories(): void;
    addCompletedStory(storyId: StoryId): void;
    isMASReleaseVariant: boolean;
};

/**
 * Shows story frames and handles navigation.
 * Main stories component.
 */
export function StoriesLayer({
    story,
    moveToNextStory,
    closeStories,
    addCompletedStory,
    isMASReleaseVariant,
}: StoriesLayerProps) {
    const intervalRef = useRef<NodeJS.Timer>();
    const [navigation, dispatch] = useReducer(navigationReducer, story);
    const { currentFrameIndex, length, id, isFirstFrameReturnedBack } = navigation;

    const handleClose = useCallback(() => {
        addCompletedStory(id);
        closeStories();
    }, [id, closeStories, addCompletedStory]);

    const handleFrameClick = useCallback((frameIndex: number) => {
        dispatch(actions.setIndex(frameIndex));
    }, []);

    const handlePrevious = useCallback(() => {
        dispatch(actions.prev());
    }, []);

    const handleNext = useCallback(() => {
        if (currentFrameIndex >= length - 1) {
            addCompletedStory(id);
            moveToNextStory();
            return;
        }
        dispatch(actions.next());
    }, [moveToNextStory, currentFrameIndex, length, id, addCompletedStory]);

    const handleFrameNavigation = useCallback((frameId: string) => {
        dispatch(actions.setFrameById(frameId));
    }, []);

    const handleButtonAction = useCallback(() => {
        closeStories();
        addCompletedStory(id);
    }, [closeStories, id, addCompletedStory]);

    const { backgroundColor, frame } = navigation;

    useEffect(() => {
        if (currentFrameIndex === 0) {
            dispatch(actions.resetFirstFrame());
        }

        intervalRef.current = setInterval(() => {
            // If this tick would exceed the last frame, complete and move on
            if (currentFrameIndex >= length - 1) {
                clearInterval(intervalRef.current);
                addCompletedStory(id);
                moveToNextStory();
                return;
            }

            dispatch(actions.next());
        }, STORY_ANIMATION_DURATION);

        return () => clearInterval(intervalRef.current);
    }, [currentFrameIndex, id, moveToNextStory, length, frame?.frameId, addCompletedStory, isFirstFrameReturnedBack]);

    useEffect(() => {
        frame?.onFrameShown?.();
    }, [frame?.onFrameShown]);

    if (!frame) {
        return null;
    }

    // Due to totalNumber of frames can be lower than actual frames number, see telemetry story
    // We have to correct currentFrameIndex to prevent incorrect position of progress bar
    let progressBarCurrentIndex = currentFrameIndex;
    if (currentFrameIndex >= length) {
        progressBarCurrentIndex = length - 1;
    }

    return (
        <div className={s.StoriesLayer}>
            <div className={cx(s.StoriesLayer_contents, s[`StoriesLayer__${backgroundColor}`])}>
                <ProgressBarGroup
                    currentFrameIndex={progressBarCurrentIndex}
                    framesCount={story.length}
                    isFirstFrameReturnedBack={isFirstFrameReturnedBack}
                    onClose={handleClose}
                    onFrameClick={handleFrameClick}
                />
                <NavigationArrows
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                />
                <FrameContent
                    frame={frame}
                    isMASReleaseVariant={isMASReleaseVariant}
                    storyActionButtonHandle={handleButtonAction}
                    frameIdNavigation={handleFrameNavigation}
                />
            </div>
        </div>
    );
}
