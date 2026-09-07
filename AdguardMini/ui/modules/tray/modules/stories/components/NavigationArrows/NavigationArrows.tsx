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
        // The tap zones are invisible full-height areas; the role and label
        // are all VoiceOver has to announce them as back/forward controls.
        <>
            {!hideLeft && (
                <div
                    aria-label={translate('back')}
                    className={s.NavigationArrows_left}
                    role="button"
                    tabIndex={0}
                    onClick={onPrevious}
                >
                    <Icon className={cx(theme.button.whiteIcon, s.NavigationArrows_left_icon)} icon="arrow_left" />
                </div>
            )}
            <div
                aria-label={translate('next')}
                className={s.NavigationArrows_right}
                role="button"
                tabIndex={0}
                onClick={onNext}
            >
                <Icon className={cx(theme.button.whiteIcon, s.NavigationArrows_right_icon)} icon="arrow_left" />
            </div>
        </>
    );
}
