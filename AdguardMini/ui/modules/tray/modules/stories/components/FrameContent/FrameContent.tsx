// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback } from 'preact/hooks';

import theme from 'Theme';
import { Button, Text } from 'UILib';

import { resolveStoryImageSize } from '../../utils/storyImageSize';

import s from './FrameContent.module.pcss';

import type { IStoryFrame, StoryFrameButton } from '../../model';

export type FrameContentProps = {
    frame: IStoryFrame;
    frameIdNavigation(frameId: string): void;
    onClose(): void;
};

/** Story frame content. */
export function FrameContent({ frame, frameIdNavigation, onClose }: FrameContentProps) {
    const {
        title, description, descriptionElement, image, imageText, buttons,
    } = frame;

    /** Run button action, then navigate or close. */
    const handleButtonClick = useCallback((button: StoryFrameButton) => {
        button.action?.();
        if (button.nextFrameId) {
            frameIdNavigation(button.nextFrameId);
        } else if (button.closesStory !== false) {
            onClose();
        }
    }, [frameIdNavigation, onClose]);

    const imageSize = resolveStoryImageSize(buttons?.length ?? 0);

    return (
        <div className={s.FrameContent}>
            {imageText
                ? <div className={s.FrameContent_imageText}>{imageText}</div>
                : (
                    <div
                        className={cx(
                            s.FrameContent_image,
                            image && s[image],
                            imageSize === 'small' && s.FrameContent_image__small,
                            imageSize === 'big' && s.FrameContent_image__big,
                        )}
                    />
                )}
            <div>
                {title && (<Text className={s.FrameContent_title} type="h4">{title}</Text>)}
                {description && (
                    <Text className={s.FrameContent_description} type="t1">{description}</Text>
                )}
                {descriptionElement}
            </div>
            {buttons?.map((button, index) => (
                <Button
                    key={`${index}-${button.title}`}
                    className={cx(
                        button.type === 'secondary' ? s.FrameContent_buttonText : s.FrameContent_button,
                        button.type === 'secondary' ? tx.button.textButton : theme.button.storyButton,
                    )}
                    type={button.type === 'secondary' ? 'text' : 'submit'}
                    onClick={() => handleButtonClick(button)}
                >
                    <Text
                        lineHeight="none"
                        semibold={button.type !== 'secondary'}
                        type="t1"
                    >
                        {button.title}
                    </Text>
                </Button>
            ))}
        </div>
    );
}
