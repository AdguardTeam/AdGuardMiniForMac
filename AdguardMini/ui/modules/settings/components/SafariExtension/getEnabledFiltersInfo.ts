// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Number of filter names the "Filters enabled" line shows before the rest are
 * reported as "and N more".
 */
const FILTER_NAMES_LIMIT = 4;

/**
 * Minimal filter metadata the "Filters enabled" line reads.
 */
type FilterWithTitle = {
    /** Filter title shown in the UI. */
    title: string;
};

/**
 * Filter names to show in the "Filters enabled" line and the count of enabled
 * filters left out of it.
 */
export type EnabledFiltersInfo = {
    /** Titles of the enabled filters to show by name. */
    names: string[];
    /** Enabled filters left out of `names`, reported as "and N more". */
    moreCount: number;
};

/**
 * Splits the enabled filters of a Safari extension into the names to show and
 * the count reported as "and N more".
 *
 * The count is derived from the enabled filter IDs, so the line accounts for
 * every enabled filter even when the metadata of one of them has not loaded.
 *
 * @param filtersIds - Enabled filter IDs of the extension
 * @param filtersMap - Filter metadata keyed by filter ID
 * @returns Visible filter names and the number of remaining enabled filters
 */
export function getEnabledFiltersInfo(
    filtersIds: number[],
    filtersMap: ReadonlyMap<number, FilterWithTitle>,
): EnabledFiltersInfo {
    const names = filtersIds
        .map((id) => filtersMap.get(id)?.title)
        .filter((title): title is string => !!title)
        .slice(0, FILTER_NAMES_LIMIT);

    return {
        names,
        moreCount: filtersIds.length - names.length,
    };
}
