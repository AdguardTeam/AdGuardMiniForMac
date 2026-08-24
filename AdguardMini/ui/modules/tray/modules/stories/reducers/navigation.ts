// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { clamp } from '@adg/webview-utils-kit';

import { StoryNavigation } from 'Modules/tray/modules/stories/classes';

import type { IStoryFrame } from 'Modules/tray/modules/stories/model';

enum NavigationType {
    NEXT = 'NEXT',
    PREV = 'PREV',
    SET_INDEX = 'SET_INDEX',
    SET_FRAME_BY_ID = 'SET_FRAME_BY_ID',
    RESET_FIRST_FRAME = 'RESET_FIRST_FRAME',
}

export const actions = {
    next: () => ({ type: NavigationType.NEXT } as const),
    prev: () => ({ type: NavigationType.PREV } as const),
    setIndex: (index: number) => ({ type: NavigationType.SET_INDEX, payload: index } as const),
    setFrameById: (id: string) => ({ type: NavigationType.SET_FRAME_BY_ID, payload: id } as const),
    resetFirstFrame: () => ({ type: NavigationType.RESET_FIRST_FRAME } as const),
};

export type NavigationUnion = ReturnType<(typeof actions)[keyof typeof actions]>;

/**
 * Find frame index by id, or -1.
 */
function findFrameIndex(frames: IStoryFrame[], frameId: string): number {
    return frames.findIndex((frame) => frame.frameId === frameId);
}

/**
 * Story frames navigation reducer.
 */
export function navigationReducer(state: StoryNavigation, action: NavigationUnion): StoryNavigation {
    switch (action.type) {
        case NavigationType.NEXT: {
            const next = new StoryNavigation(state.storyInfo);
            next.currentFrameIndex = state.currentFrameIndex + 1;
            next.history = [...state.history, state.currentFrameIndex];
            return next;
        }
        case NavigationType.PREV: {
            const prev = new StoryNavigation(state.storyInfo);
            if (state.history.length > 0) {
                prev.currentFrameIndex = state.history[state.history.length - 1];
                prev.history = state.history.slice(0, -1);
            } else {
                prev.currentFrameIndex = Math.max(0, state.currentFrameIndex - 1);
                if (prev.currentFrameIndex === 0) {
                    prev.isFirstFrameReturnedBack = true;
                }
            }
            return prev;
        }
        case NavigationType.SET_INDEX: {
            const max = state.storyInfo.frames.length - 1;
            const index = clamp(action.payload, 0, max);
            if (index === state.currentFrameIndex) {
                return state;
            }
            const set = new StoryNavigation(state.storyInfo);
            set.currentFrameIndex = index;
            set.history = [...state.history, state.currentFrameIndex];
            return set;
        }
        case NavigationType.SET_FRAME_BY_ID: {
            const index = findFrameIndex(state.storyInfo.frames, action.payload);
            if (index === -1) {
                log.error(`[STORY: ${state.storyInfo.id}] Frame with id ${action.payload} not found`);
                return state;
            }
            if (index === state.currentFrameIndex) {
                return state;
            }
            const set = new StoryNavigation(state.storyInfo);
            set.currentFrameIndex = index;
            set.history = [...state.history, state.currentFrameIndex];
            return set;
        }
        case NavigationType.RESET_FIRST_FRAME: {
            return new StoryNavigation(state.storyInfo);
        }
        default:
            return state;
    }
}
