// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { StoryViewConfig } from '../model';

/**
 * Frames navigation logic for story
 */
export class StoryNavigation {
    public currentFrameIndex = 0;

    /**
     * Indicates whether the first frame has been returned back
     * from the next frames
     */
    public isFirstFrameReturnedBack = false;

    /**
     *
     */
    public get frame() {
        return this.storyInfo.frames[this.currentFrameIndex];
    }

    /**
     *
     */
    public get length() {
        return Math.min(this.storyInfo.totalFrames || this.storyInfo.frames.length, this.storyInfo.frames.length);
    }

    /**
     * Callback to call before next story is shown/story closed
     */
    public get onBeforeClose() {
        return this.storyInfo.onBeforeClose;
    }

    /**
     *
     */
    public get id() {
        return this.storyInfo.id;
    }

    /**
     *
     */
    public get backgroundColor() {
        return this.storyInfo.backgroundColor;
    }

    /**
     *
     */
    public constructor(public readonly storyInfo: StoryViewConfig) {}

    /**
     *
     */
    public next() {
        this.currentFrameIndex++;
        return this;
    }

    /**
     *
     */
    public prev() {
        this.currentFrameIndex--;
        return this;
    }

    /**
     *
     */
    public setIndex(index: number) {
        this.currentFrameIndex = index;
        return this;
    }
}
