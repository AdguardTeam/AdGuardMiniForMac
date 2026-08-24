// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Gets the statuses of entities based on the enabled and total count of entities
 *
 * @param {number} enabledCount - The number of entities that are currently enabled
 * @param {number} totalCount - The total number of entities
 */
export function getCountableEntityStatuses(enabledCount: number, totalCount: number) {
    return {
        allDisabled: enabledCount === 0,
        someDisabled: enabledCount > 0 && enabledCount < totalCount,
        allEnabled: enabledCount === totalCount,
    };
}
