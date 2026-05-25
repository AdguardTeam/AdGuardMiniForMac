// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Resolves the timestamp displayed under filters only for the `nothingToUpdate` state.
 *
 * @param filtersStatus - Current filters status from update flow.
 * @param timestampMs - Last successful filters update timestamp from global settings.
 * @returns A safe timestamp for rendering, or `null` when it must stay hidden.
 */
export function resolveLastFiltersUpdateTimestamp(
    filtersStatus: 'updated' | 'error' | 'nothingToUpdate' | null,
    timestampMs: number | undefined,
): number | null {
    if (filtersStatus !== 'nothingToUpdate') {
        return null;
    }

    if (!Number.isFinite(timestampMs) || !timestampMs || timestampMs < 0) {
        return null;
    }

    return timestampMs;
}
