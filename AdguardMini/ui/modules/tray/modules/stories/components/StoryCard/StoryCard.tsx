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
        <div className={cx(s.StoryCard, s[`StoryCard__${style}`], className)} onClick={onClick}>
            <div className={s.StoryCard_header}>
                <Icon className={cx(s.StoryCard_icon, s[`StoryCard_icon__${style}`])} icon={icon} big />
                {onHide && (
                    <Text className={s.StoryCard_hideText} type="t3" onClick={handleHide}>
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
