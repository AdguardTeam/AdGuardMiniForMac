// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Route parameter map type
 * Used to pass parameters when changing routes
 */
export type RouteParamsMap<Params extends Record<string, any> = Record<string, any>> = Params | undefined;

/**
 * Interface for router functionality
 */
export interface IRouter<Path extends string> {
    /**
     * Current route path
     */
    currentPath: Path;

    /**
     * Change the current route
     * @param path The new route path
     * @param params Optional parameters to pass with the route
     */
    changePath(path: Path, params?: RouteParamsMap): void;

    /**
     * Get the current route hash (useful for detecting parameter changes)
     */
    getPathHash(): string;
}
