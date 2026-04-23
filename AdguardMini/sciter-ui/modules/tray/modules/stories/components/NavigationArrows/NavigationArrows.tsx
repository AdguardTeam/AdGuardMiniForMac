// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';
import { Icon } from 'UILib';

import s from './NavigationArrows.module.pcss';

type NavigationArrowsProps = {
    onPrevious(): void;
    onNext(): void;
    hideLeft?: boolean;
};

/**
 * Navigation arrows component for stories
 */
export function NavigationArrows({ onPrevious, onNext, hideLeft }: NavigationArrowsProps) {
    return (
        <>
            {!hideLeft && (
                <div className={s.NavigationArrows_left} onClick={onPrevious}>
                    <Icon className={cx(theme.button.whiteIcon, s.NavigationArrows_left_icon)} icon="arrow_left" />
                </div>
            )}
            <div className={s.NavigationArrows_right} onClick={onNext}>
                <Icon className={cx(theme.button.whiteIcon, s.NavigationArrows_right_icon)} icon="arrow_left" />
            </div>
        </>
    );
}
