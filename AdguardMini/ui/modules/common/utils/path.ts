// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Returns the directory portion of a POSIX-style path, without a trailing
 * slash. Empty when the path has no directory component (e.g. a bare
 * filename). Mirrors the previous inline `split('/')` + `pop()` + `join('/')`
 * pattern used by the import/export file-panel handlers.
 *
 * @param path - The absolute or relative path.
 * @returns The directory portion, or '' for a bare filename.
 */
export function dirname(path: string): string {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
}
