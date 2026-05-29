// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { isString } from '@adg/sciter-utils-kit';
import { useMemo } from 'preact/hooks';

import { Icon } from 'UILib';

import s from './Pagination.module.pcss';
import { PaginationItem } from './PaginationItem';

type PaginationProps = {
    currentPage: number;
    pageCount: number;
    onChangePage(page: number): void;
    className?: string;
    testId?: string;
};

const generatePagination = (
    currentPage: number,
    totalPages: number,
    pagesShown: number,
) => {
    const start = Math.max(1, Math.min(currentPage - Math.floor((pagesShown - 3) / 2), totalPages - pagesShown + 2));
    const end = Math.min(totalPages, Math.max(currentPage + Math.floor((pagesShown - 2) / 2), pagesShown - 1));
    const paginationArray: (string | number)[] = [];

    if (start > 2) {
        paginationArray.push(1, '...');
    } else if (start > 1) {
        paginationArray.push(1);
    }

    paginationArray.push(...Array.from({ length: (end + 1) - start }, (_, i) => i + start));

    if (end < totalPages - 1) {
        paginationArray.push('...', totalPages);
    } else if (end < totalPages) {
        paginationArray.push(totalPages);
    }

    return paginationArray;
};

/**
 * Pagination ui component
 */
export function Pagination({
    className,
    currentPage,
    pageCount,
    onChangePage,
    testId,
}: PaginationProps) {
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === pageCount;
    const pagination = useMemo(
        () => generatePagination(currentPage, pageCount, 7),
        [currentPage, pageCount],
    );

    return (
        <ul id={testId} className={cx(s.Pagination, className)}>
            <PaginationItem
                disabled={isFirstPage}
                isArrow
                onClick={isFirstPage ? undefined : () => onChangePage(currentPage - 1)}
            >
                <Icon className={s.Pagination_arrowLeft} icon="arrow_left" small />
            </PaginationItem>
            {pagination.map((paginationItem: string | number) => {
                const active = paginationItem === currentPage;
                const isEllipsis = isString(paginationItem);
                const handleClick = (isEllipsis || active) ? undefined : () => onChangePage(paginationItem);

                return (
                    <PaginationItem
                        key={paginationItem}
                        active={active}
                        isEllipsis={isEllipsis}
                        onClick={handleClick}
                    >
                        {paginationItem}
                    </PaginationItem>
                );
            })}
            <PaginationItem
                disabled={isLastPage}
                isArrow
                onClick={isLastPage ? undefined : () => onChangePage(currentPage + 1)}
            >
                <Icon className={s.Pagination_arrowRight} icon="arrow_left" small />
            </PaginationItem>
        </ul>
    );
}
