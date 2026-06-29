// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { AccountCallbackService } from 'Apis/callbacks/AccountCallbackService';
import { AccountCallbackServiceInternal } from 'Apis/callbacks/AccountCallbackServiceInternal';
import { FiltersCallbackService, type IFiltersCallbackService, type IFiltersCallbackServiceInternal } from 'Apis/callbacks/FiltersCallbackService';
import { FiltersCallbackServiceInternal } from 'Apis/callbacks/FiltersCallbackServiceInternal';
import { SettingsCallbackService } from 'Apis/callbacks/SettingsCallbackService';
import { SettingsCallbackServiceInternal } from 'Apis/callbacks/SettingsCallbackServiceInternal';
import { UserRulesCallbackService, type IUserRulesCallbackService, type IUserRulesCallbackServiceInternal } from 'Apis/callbacks/UserRulesCallbackService';
import { UserRulesCallbackServiceInternal } from 'Apis/callbacks/UserRulesCallbackServiceInternal';

import type { IAccountCallbackService, IAccountCallbackServiceInternal } from 'Apis/callbacks/AccountCallbackService';
import type { ISettingsCallbackService, ISettingsCallbackServiceInternal } from 'Apis/callbacks/SettingsCallbackService';

/**
 * Proto callbacks for Settings module;
 */
export class API_CALLBACK {
    public SettingsCallbackService: ISettingsCallbackService;

    public AccountCallbackService: IAccountCallbackService;

    public FiltersCallbackService: IFiltersCallbackService;

    public UserRulesCallbackService: IUserRulesCallbackService;

    /**
     *
     */
    constructor(
        settingsCallbackService: ISettingsCallbackServiceInternal,
        accountCallbackService: IAccountCallbackServiceInternal,
        filtersCallbackService: IFiltersCallbackServiceInternal,
        userRulesCallbackService: IUserRulesCallbackServiceInternal,
    ) {
        this.SettingsCallbackService = new SettingsCallbackService(settingsCallbackService);
        this.AccountCallbackService = new AccountCallbackService(accountCallbackService);
        this.FiltersCallbackService = new FiltersCallbackService(filtersCallbackService);
        this.UserRulesCallbackService = new UserRulesCallbackService(userRulesCallbackService);
    }
}

declare global {
    interface Window {
        // @ts-ignore
        API_CALLBACK: API_CALLBACK;
    }
}

// @ts-ignore
window.API_CALLBACK = new API_CALLBACK(
    new SettingsCallbackServiceInternal(),
    new AccountCallbackServiceInternal(),
    new FiltersCallbackServiceInternal(),
    new UserRulesCallbackServiceInternal(),
);
