// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useCallback } from 'preact/hooks';

import { useTrayStore } from 'Modules/tray/lib/hooks';
import { Text, Icon } from 'UILib';

import s from './StoryCard.module.pcss';

import type { StoryId, StoryInfo } from 'Modules/tray/modules/stories/model';

export type StoryCardProps = Omit<StoryInfo, 'storyConfig'> & {
    storyId: StoryId;
    setSelectedStoryId(storyId: StoryId): void;
    className?: string;
    onHide?(): void;
};

/**
 * Story card component with optional hide affordance
 */
function StoryCardComponent({
    style = 'default',
    icon,
    text,
    storyId,
    setSelectedStoryId,
    className,
    telemetryEvent,
    content,
    ariaText,
    onHide,
}: StoryCardProps) {
    const { telemetry } = useTrayStore();

    const onClick = useCallback(() => {
        setSelectedStoryId(storyId);
        if (telemetryEvent) {
            telemetry.trackEvent(telemetryEvent);
        }
    }, [setSelectedStoryId, storyId, telemetry, telemetryEvent]);

    const handleHide = useCallback((e: MouseEvent) => {
        e.stopPropagation();
        onHide?.();
    }, [onHide]);

    return (
        // The role sits on the card itself so it is the first tab stop and
        // announces the story it opens; Hide is a separate stop right after.
        // `aria-label` also stops the card from reading its own Hide caption
        // as part of its name.
        <div
            aria-label={translate('tray.story.card.aria', { title: ariaText ?? text })}
            className={cx(s.StoryCard, s[`StoryCard__${style}`], className)}
            role="button"
            tabIndex={0}
            onClick={onClick}
        >
            <div className={s.StoryCard_header}>
                <Icon className={cx(s.StoryCard_icon, s[`StoryCard_icon__${style}`])} icon={icon} big />
                {onHide && (
                    <Text
                        ariaLabel={translate('tray.story.hide.aria')}
                        className={s.StoryCard_hideText}
                        role="button"
                        tabIndex={0}
                        type="t3"
                        onClick={handleHide}
                    >
                        {translate('tray.story.hide')}
                    </Text>
                )}
            </div>
            <div className={s.StoryCard_body}>
                {content}
                <Text type="t2">{text}</Text>
            </div>
        </div>
    );
}

export const StoryCard = observer(StoryCardComponent);
