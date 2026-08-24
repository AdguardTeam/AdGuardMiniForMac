// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useRef } from 'preact/compat';

import type { IRouter } from 'Modules/common/stores/interfaces/IRouter';

/**
 * Hook to track router location changes
 *
 * @param router The router instance
 * @param action Callback function that receives the current route
 * @param detectParamsChanges Whether to detect parameter changes (default: true)
 */
export function useLocation<Routes extends string>(
    router: IRouter<Routes>,
    action: (currentRoute: Routes) => void,
    detectParamsChanges: boolean = true,
) {
    const ref = useRef(action);

    const pathHash = detectParamsChanges ? router.getPathHash() : undefined;

    useEffect(() => {
        ref.current(router.currentPath);
    }, [router.currentPath, pathHash]);
}
