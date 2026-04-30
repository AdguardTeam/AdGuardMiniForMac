// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useReducer, useEffect } from 'preact/hooks';

import { actions, navigationReducer } from 'Modules/tray/modules/stories/reducers';
import { resolveBackTransition } from 'Modules/tray/modules/stories/utils/navigationBoundary';

import { FrameContent, NavigationArrows, ProgressBarGroup } from '..';

import s from './StoriesLayer.module.pcss';

import type { StoryNavigation } from 'Modules/tray/modules/stories/classes';
import type { StoryId } from 'Modules/tray/modules/stories/model';

type StoriesLayerProps = {
    story: StoryNavigation;
    moveToNextStory(): void;
    moveToPreviousStory(): void;
    hasPreviousStory: boolean;
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
    moveToPreviousStory,
    hasPreviousStory,
    closeStories,
    addCompletedStory,
    isMASReleaseVariant,
}: StoriesLayerProps) {
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
        const transition = resolveBackTransition(currentFrameIndex, hasPreviousStory);

        if (transition === 'story') {
            moveToPreviousStory();
            return;
        }

        if (transition === 'frame') {
            dispatch(actions.prev());
        }
    }, [currentFrameIndex, hasPreviousStory, moveToPreviousStory]);

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
    }, [currentFrameIndex, isFirstFrameReturnedBack]);

    useEffect(() => {
        frame?.onFrameShown?.();
    }, [frame?.onFrameShown]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'ArrowRight') {
                handleNext();
            } else if (e.code === 'ArrowLeft') {
                handlePrevious();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrevious]);

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
                    onClose={handleClose}
                    onFrameClick={handleFrameClick}
                />
                <NavigationArrows
                    hideLeft={currentFrameIndex === 0 && !hasPreviousStory}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                />
                <FrameContent
                    frame={frame}
                    frameIdNavigation={handleFrameNavigation}
                    isMASReleaseVariant={isMASReleaseVariant}
                    storyActionButtonHandle={handleButtonAction}
                />
            </div>
        </div>
    );
}
