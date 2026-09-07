// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useId, useReducer, useEffect, useRef } from 'preact/hooks';

import { useFocusTrap } from 'Common/hooks/useFocusTrap';
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
    /** Lowest frame index visible in this session. Non-zero when entering from a hide action at a later frame. */
    minFrameIndex?: number;
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
    minFrameIndex = 0,
}: StoriesLayerProps) {
    const [navigation, dispatch] = useReducer(navigationReducer, story);
    const frameTitleId = useId();
    const layerRef = useRef<HTMLDivElement>(null);

    useFocusTrap(layerRef);
    const { currentFrameIndex, length, id, isFirstFrameReturnedBack } = navigation;
    const { backgroundColor, frame } = navigation;

    const handleClose = useCallback(() => {
        addCompletedStory(id);
        closeStories();
    }, [id, closeStories, addCompletedStory]);

    const handleFrameClick = useCallback((frameIndex: number) => {
        dispatch(actions.setIndex(frameIndex));
    }, []);

    const handlePrevious = useCallback(() => {
        if (navigation.history.length > 0) {
            dispatch(actions.prev());
            return;
        }

        const transition = resolveBackTransition(currentFrameIndex, hasPreviousStory);

        if (transition === 'story') {
            moveToPreviousStory();
            return;
        }

        if (transition === 'frame') {
            dispatch(actions.prev());
        }
    }, [navigation.history.length, currentFrameIndex, hasPreviousStory, moveToPreviousStory]);

    const handleNext = useCallback(() => {
        if (frame?.nextFrameId) {
            const frameExists = navigation.storyInfo.frames.some(
                (f) => f.frameId === frame.nextFrameId,
            );
            if (frameExists) {
                dispatch(actions.setFrameById(frame.nextFrameId));
                return;
            }
        }

        if (currentFrameIndex >= length - 1) {
            addCompletedStory(id);
            moveToNextStory();
            return;
        }

        dispatch(actions.next());
    }, [
        frame?.nextFrameId,
        navigation.storyInfo.frames,
        moveToNextStory,
        currentFrameIndex,
        length,
        id,
        addCompletedStory,
    ]);

    const handleFrameNavigation = useCallback((frameId: string) => {
        dispatch(actions.setFrameById(frameId));
    }, []);

    useEffect(() => {
        if (currentFrameIndex === 0) {
            dispatch(actions.resetFirstFrame());
        }
    }, [currentFrameIndex, isFirstFrameReturnedBack]);

    useEffect(() => {
        frame?.onFrameShown?.();
    }, [frame, frame?.onFrameShown]);

    // The story opens as an overlay over the tray without touching focus, so
    // nothing announces it and the close button stays out of reach. Move focus
    // to the frame heading on open and on every frame change; frames with no
    // heading fall back to the dialog itself, which announces its own label.
    useEffect(() => {
        const heading = document.getElementById(frameTitleId);
        (heading ?? layerRef.current)?.focus();
    }, [frameTitleId, frame]);

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
        // The layer covers the whole tray window; dialog semantics keep the
        // VoiceOver cursor inside it instead of the Home screen underneath.
        <div
            ref={layerRef}
            aria-label={translate('tray.home.stories.title')}
            className={s.StoriesLayer}
            role="dialog"
            tabIndex={-1}
            aria-modal
        >
            <div className={cx(s.StoriesLayer_contents, s[`StoriesLayer__${backgroundColor}`])}>
                <ProgressBarGroup
                    currentFrameIndex={progressBarCurrentIndex}
                    framesCount={story.length}
                    onClose={handleClose}
                    onFrameClick={handleFrameClick}
                />
                <NavigationArrows
                    hideLeft={currentFrameIndex === minFrameIndex && !hasPreviousStory}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                />
                <FrameContent
                    frame={frame}
                    frameIdNavigation={handleFrameNavigation}
                    titleId={frameTitleId}
                    onClose={handleClose}
                />
            </div>
        </div>
    );
}
