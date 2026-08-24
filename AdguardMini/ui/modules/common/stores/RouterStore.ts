// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import type { IRouter, RouteParamsMap } from './interfaces/IRouter';

/**
 * Router store for managing application navigation and routes
 */
export class RouterStore<Route extends string> implements IRouter<Route> {
    /**
     * Current route params
     *
     * @protected
     */
    protected params: RouteParamsMap;

    /**
     * Current route
     */
    public currentPath: Route;

    /**
     * Ctor
     *
     * @param homeRoute The initial route to set as current
     */
    public constructor(homeRoute: Route) {
        this.currentPath = homeRoute;

        makeAutoObservable(this, undefined, { autoBind: true });
    }

    /**
     * Used for typescript casting
     */
    public castParams<Params>() {
        return this.params as Params | undefined;
    }

    /**
     * Change path with params
     *
     * @param path The new route to navigate to
     * @param params Optional parameters for the route
     */
    public changePath(path: Route, params?: RouteParamsMap) {
        log.dbg(`Router, navigate from ${this.currentPath} to ${path}`);

        this.params = params;
        this.currentPath = path;
    }

    /**
     * Used for the "key" prop in router
     */
    public getPathHash(): string {
        return this.currentPath + JSON.stringify(this.params);
    }
}
