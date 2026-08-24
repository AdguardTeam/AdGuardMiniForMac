// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

export type BackTransition = 'frame' | 'story' | 'none';
export type StoryEntryMode = 'first' | 'last';

/**
 * Decides whether Back should move within the current story,
 * jump to the previous story, or do nothing at the start boundary.
 */
export function resolveBackTransition(currentFrameIndex: number, hasPreviousStory: boolean): BackTransition {
    if (currentFrameIndex > 0) {
        return 'frame';
    }

    if (hasPreviousStory) {
        return 'story';
    }

    return 'none';
}

/**
 * Returns the frame index used when opening a story from navigation:
 * first frame for forward flow, last frame for backward flow.
 */
export function resolveStoryEntryFrame(framesLength: number, entryMode: StoryEntryMode): number {
    if (entryMode === 'first') {
        return 0;
    }

    return Math.max(0, framesLength - 1);
}
