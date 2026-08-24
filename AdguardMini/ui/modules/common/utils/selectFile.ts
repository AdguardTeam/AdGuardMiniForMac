// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { SelectFileRequest } from 'Apis/requests/SettingsService';

/** Parse Sciter-style filter into comma-separated extensions. */
function parseExtensions(filter: string | undefined): string {
    if (!filter) {
        return '';
    }
    const matches = Array.from(filter.matchAll(/\*\.([a-zA-Z0-9*]+)/g));
    return [...new Set(matches.map((m) => m[1]))].join(',');
}

/** Open native file panel via `SettingsService.SelectFile` RPC. */
export async function selectFile(
    writeMode: boolean,
    extension: string | undefined,
    title: string,
    initialDir: string,
    onSuccess: (path: string) => Promise<unknown>,
) {
    let result;
    try {
        result = await window.API.Execute(new SelectFileRequest({
            isSave: writeMode,
            title,
            allowedExtensions: parseExtensions(extension),
            initialPath: initialDir,
        }));
    } catch (err) {
        // `rpcCall` rejects on timeout / missing handler; surface it instead
        // of leaving the caller hanging or `onSuccess` armed with no panel.
        // eslint-disable-next-line no-console
        console.error('[selectFile] panel RPC failed:', err);
        return;
    }

    if (!result.path) {
        return;
    }

    try {
        return await onSuccess(result.path);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[selectFile] onSuccess handler threw:', err);
        return undefined;
    }
}
