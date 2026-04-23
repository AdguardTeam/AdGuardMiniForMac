// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { TrayEvent } from 'Modules/tray/store/modules';
import type { JSX } from 'preact';

/**
 * Story ID type
 */
export type StoryId = string;

/**
 * Story card icon classname
 */
export type StoryCardIcon = 'info' | 'quality' | 'phone' | 'custom_filter' | 'star' | 'advanced' | 'rocket' | 'adblocking' | 'tracking';

export type StoryCardStyle = 'default' | 'warning' | 'redIcon' | 'orangeIcon';

/**
 * Story background color classname
 */
export type StoryBackgroundColor = 'aqua' | 'blue' | 'green' | 'purple' | 'sand' | 'sandBlue' | 'sandGreen' | 'emerald' | 'red' | 'orange';

/**
 * Story frame image classname
 */
export type StoryFrameImage = 'advanced' | 'devices' | 'extensions' | 'extra1' | 'extra2' | 'extra3' | 'extra4' | 'filters1' | 'filters2' | 'filters3' | 'filters4' | 'filters5' | 'loginItem' | 'rate' | 'telemetry1' | 'telemetry2' | 'telemetry3' | 'telemetry4';

/**
 * Main story model
 */
export type StoryInfo = {
    /**
     * Style for card
     */
    style?: StoryCardStyle;
    /** */
    /**
     * Icon for card
     */
    icon: StoryCardIcon;
    /**
     * Text for card
     */
    text: string;
    /**
     * Additional content for card
     */
    content?: JSX.Element;
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
    title?: string;
    /**
     * Story description
     */
    description?: string;
    /**
     * Story description element
     */
    descriptionElement?: JSX.Element;
    /**
     * Story image bound to the CSS class
     */
    image?: StoryFrameImage;

    /**
     * Text to display instead of an image
     */
    imageText?: JSX.Element;

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
    component?: React.FC<{ isMASReleaseVariant: boolean; frameIdNavigation(frameId: string): void }>;

    /**
     * Callback to call when frame shown
     */
    onFrameShown?(): void;
}
