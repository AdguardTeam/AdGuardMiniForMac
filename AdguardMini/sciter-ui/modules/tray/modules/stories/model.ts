// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { TrayEvent } from 'Modules/tray/store/modules';

/**
 * Story ID type
 */
export type StoryId = string;

/**
 * Story card icon classname
 */
export type StoryCardIcon = 'info' | 'quality' | 'phone' | 'custom_filter' | 'star' | 'advanced' | 'rocket';

/**
 * Story background color classname
 */
export type StoryBackgroundColor = 'aqua' | 'blue' | 'green' | 'purple' | 'sand' | 'sandBlue' | 'emerald';

/**
 * Story frame image classname
 */
export type StoryFrameImage = 'advanced' | 'devices' | 'extensions' | 'extra1' | 'extra2' | 'extra3' | 'filters1' | 'filters2' | 'filters3' | 'filters4' | 'filters5' | 'loginItem' | 'rate1' | 'rate2' | 'rate3' | 'telemetry1' | 'telemetry3' | 'telemetry4';

/**
 * Main story model
 */
export type StoryInfo = {
    /**
     * Warning style for card
     */
    warning?: boolean;
    /**
     * Icon for card
     */
    icon: StoryCardIcon;
    /**
     * Text for card
     */
    text: string;
    /**
     * Story display config
     */
    storyConfig: StoryViewConfig;
    /**
     * Telemetry event to send when this story is selected
     * If not provided, no telemetry will be sent
     */
    telemetryEvent?: TrayEvent;
};

/**
 * Story view model
 */
export type StoryViewConfig = {
    /**
     * Story identifier
     */
    id: StoryId;

    /**
     * Total number of frames in the story, used in telemetry story due to number of frames is 4,
     * but total number of frames is 3
     */
    totalFrames?: number;

    /**
     * One media frame of a story
     */
    frames: IStoryFrame[];

    /**
     * Story background color class name.
     * In CSS it is used as a class with specified gradient.
     */
    backgroundColor: StoryBackgroundColor;

    /**
     * Callback to call before next story is shown/story closed
     */
    onBeforeClose?(): void;
};

/**
 * Story frame model
 */
export interface IStoryFrame {
    /**
     * Story title
     */
    title: string;
    /**
     * Story description
     */
    description: string;
    /**
     * Story image bound to the CSS class
     */
    image: StoryFrameImage;

    /**
     * Basic action button for frame
     */
    actionButton?: {
        title: string;
        action(): void;
    };

    /**
     * Unique frame id
     */
    frameId: string;

    /**
     * Component to render under frame title and description
     *
     * @see FrameContent
     */
    component?: React.FC<{ isMASReleaseVariant: boolean, frameIdNavigation(frameId: string): void }>;
}
