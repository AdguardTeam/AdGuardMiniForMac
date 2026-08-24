// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useCallback } from 'preact/hooks';

import { Text, Icon } from 'UILib';

import s from './ShowHiddenCard.module.pcss';

/**
 * Props for the {@link ShowHiddenCard} component.
 */
export type ShowHiddenCardProps = {
    /** Callback invoked when the user clicks the card to restore hidden stories. */
    onShowHidden(): void;
};

/**
 * Card that appears when stories are hidden. Shows an eye icon and "Show hidden"
 * text. Card styling matches Figma Mobile_StoryCard component.
 */
function ShowHiddenCardComponent({ onShowHidden }: ShowHiddenCardProps) {
    const handleClick = useCallback(() => onShowHidden(), [onShowHidden]);

    return (
        <div className={s.ShowHiddenCard} onClick={handleClick}>
            <div className={s.ShowHiddenCard_header}>
                <Icon className={s.ShowHiddenCard_icon} icon="eye" big />
            </div>
            <div className={s.ShowHiddenCard_body}>
                <Text className={s.ShowHiddenCard_text} type="t2">{translate('tray.story.show_hidden')}</Text>
            </div>
        </div>
    );
}

export const ShowHiddenCard = observer(ShowHiddenCardComponent);
