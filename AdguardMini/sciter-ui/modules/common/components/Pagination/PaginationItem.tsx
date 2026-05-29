// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import s from './Pagination.module.pcss';

import type { ComponentChild } from 'preact';
// Styles

type PaginationItemProps = {
    children: ComponentChild;
    onClick?(): void;
    active?: boolean;
    disabled?: boolean;
    isEllipsis?: boolean;
    isArrow?: boolean;
    testId?: string;

};

/**
 * Pagination item component
 */
export function PaginationItem({
    children,
    onClick,
    active,
    disabled,
    isEllipsis,
    isArrow,
    testId,
}: PaginationItemProps) {
    return (
        <li className={s.Pagination_item}>
            <button
                id={testId}
                className={cx(
                    s.Pagination_element,
                    isArrow && s.Pagination_arrow,
                    ...(isEllipsis ? [] : [
                        s.Pagination_button,
                        active && s.Pagination_button__active,
                        disabled && s.Pagination_button__disabled]
                    ),
                )}
                role={isEllipsis ? 'none' : 'button'}
                tabIndex={isEllipsis ? -1 : 0}
                type="button"
                onClick={onClick}
            >
                {children}
            </button>
        </li>
    );
}
