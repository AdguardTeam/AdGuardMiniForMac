// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import s from './InfoCard.module.pcss';

import type { ComponentChild, ComponentChildren } from 'preact';

type InfoCardProps = {
    titleSlot: ComponentChild;
    children: ComponentChildren;
    buttonSlot: ComponentChild;
    withHeaderPadding?: boolean;
    withFooterPadding?: boolean;
    withBottomMargin?: boolean;
    className?: string;
};

/**
 * Template component for info cards on License screen
 */
export function InfoCard({
    titleSlot,
    children,
    buttonSlot,
    withHeaderPadding,
    withFooterPadding,
    withBottomMargin,
    className,
}: InfoCardProps) {
    return (
        <div className={cx(s.InfoCard, withBottomMargin && s.InfoCard__withBottomMargin, className)}>
            <div
                className={cx(
                    s.InfoCard_header,
                    withHeaderPadding && s.InfoCard_header__withPadding,
                )}
            >
                {titleSlot}
            </div>

            {children}

            <div
                className={cx(
                    s.InfoCard_footer,
                    withFooterPadding && s.InfoCard_footer__withPadding,
                )}
            >
                {buttonSlot}
            </div>
        </div>
    );
}
