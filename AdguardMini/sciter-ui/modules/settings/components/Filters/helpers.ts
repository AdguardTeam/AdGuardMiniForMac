// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { Filter, FilterGroup } from 'Apis/types';

/**
 * Extended group type with filter IDs.
 */
export interface GroupWithFilters {
    groupId: number;
    groupName: string;
    displayNumber: number;
    filters: number[];
}

/**
 * Divides a flat filter list into groups based on groupId.
 * Used for displaying search results grouped by filter group.
 *
 * @param list Flat list of filters.
 * @param groups List of filter groups.
 * @returns Groups with attached filter IDs.
 */
export function divideByGroups(list: Filter[], groups: FilterGroup[]): GroupWithFilters[] {
    const temp = new Map<number, Set<number>>();
    list.forEach((f) => {
        if (temp.has(f.groupId)) {
            temp.get(f.groupId)!.add(f.id);
        } else {
            const set = new Set<number>();
            set.add(f.id);
            temp.set(f.groupId, set);
        }
    });
    const extendedGroups: GroupWithFilters[] = [];
    groups.forEach((g) => {
        if (temp.has(g.groupId)) {
            extendedGroups.push({
                groupId: g.groupId,
                groupName: g.groupName,
                displayNumber: g.displayNumber,
                filters: Array.from(temp.get(g.groupId)!.values()),
            });
        }
    });
    return extendedGroups;
}
