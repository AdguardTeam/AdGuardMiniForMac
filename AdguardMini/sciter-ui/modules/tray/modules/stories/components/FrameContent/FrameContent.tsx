// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback } from 'preact/hooks';

import theme from 'Theme';
import { Button, Text } from 'UILib';

import s from './FrameContent.module.pcss';

import type { IStoryFrame } from 'Modules/tray/modules/stories/model';

export type FrameContentProps = {
    frame: IStoryFrame;
    storyActionButtonHandle(): void;
    isMASReleaseVariant: boolean;
    frameIdNavigation(frameId: string): void;
};

/**
 * Represents content of story frame
 */
export function FrameContent({
    frame, storyActionButtonHandle, isMASReleaseVariant, frameIdNavigation,
}: FrameContentProps) {
    const { title, description, descriptionElement, image, imageText, actionButton, component: Component } = frame;

    const handleAction = useCallback(() => {
        storyActionButtonHandle();
        if (actionButton) {
            actionButton.action();
        }
    }, [storyActionButtonHandle, actionButton]);

    return (
        <div className={s.FrameContent}>
            {imageText
                ? <div className={s.FrameContent_imageText}>{imageText}</div>
                : <div className={cx(s.FrameContent_image, image && s[image])} />}
            <div>
                {title && (<Text className={s.FrameContent_title} type="h4">{title}</Text>)}
                {description && (
                    <Text className={s.FrameContent_description} type="t1">{description}</Text>
                )}
                {descriptionElement}
            </div>
            {actionButton && (
                <Button className={cx(s.FrameContent_button, theme.button.storyButton)} type="submit" onClick={handleAction}>
                    <Text lineHeight="none" type="t1" semibold>{actionButton.title}</Text>
                </Button>
            )}
            {Component && (
                <Component frameIdNavigation={frameIdNavigation} isMASReleaseVariant={isMASReleaseVariant} />
            )}
            <div className={s.FrameContent_bottom} />
        </div>
    );
}
