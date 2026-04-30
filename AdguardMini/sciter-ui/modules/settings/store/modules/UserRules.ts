// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { AddUserRuleRequest, ExportUserRulesRequest, GetUserRulesRequest, ImportUserRulesRequest, ResetUserRulesRequest, UpdateUserRulesRequest } from 'Apis/requests/UserRulesService';
import { UserRule, UserRules as UserRulesEnt } from 'Apis/types';
import { withLast } from 'Common/utils/queue';

import type { OptionalError, UserRulesCallbackState } from 'Apis/types';
import type { SettingsStore } from 'SettingsStore';

type UserRuleObject = Required<ReturnType<UserRule['toObject']>>;
export type UserRulesContainer = Array<(UserRuleObject & { index: number })>;

/**
 * App UserRules store
 */
export class UserRules {
    rootStore: SettingsStore;

    /**
     * User rules
     */
    public userRules = new UserRulesEnt();

    public rules: UserRulesContainer = [];

    /**
     * Disable import message
     */
    public dontAskAgainImportModal = false;

    /**
     * Ctor
     *
     * @param rootStore
     */
    public constructor(rootStore: SettingsStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this, {
            rootStore: false,
        }, { autoBind: true });
    }

    /**
     * Setter for dontAskAgainImportModal
     */
    public setDontAskAgainImportModal(value: boolean) {
        this.dontAskAgainImportModal = value;
    }

    /**
     * Get user rules
     */
    public async getUserRules() {
        const resp = await window.API.Execute(new GetUserRulesRequest());
        this.setUserRules(resp);
    }

    /**
     * Add one user rule
     * @param rule new rule
     */
    public async addUserRule(rule: string) {
        const error = await window.API.Execute(new AddUserRuleRequest({ value: rule }));
        if (error.hasError) {
            return error;
        }
        const rules = this.updateHelper();
        rules.rules.unshift(new UserRule({ rule, enabled: true }));
        this.setUserRules(rules);
    }

    /**
     * Method to update User Rules
     * @param rules: new user rules
     */
    public async updateRules(rules: UserRule[]): Promise<[OptionalError | null, UserRule[]]> {
        const newRules = this.updateHelper();
        const prevUserRules = newRules.rules.map((r) => new UserRule({ rule: r.rule, enabled: r.enabled }));
        newRules.rules = rules;
        this.setUserRules(newRules);
        const error = await window.API.Execute(new UpdateUserRulesRequest(newRules));
        if (error.hasError) {
            return [error, prevUserRules];
        }
        return [null, prevUserRules];
    }

    /**
     * Export user rules to selected destination
     * @param path path to save file
     */
    public async exportUserRules(path: string) {
        const error = await window.API.Execute(new ExportUserRulesRequest({ path }));
        if (error.hasError) {
            return error;
        }
    }

    /**
     * Import setings from selected destination
     * @param path path to read file
     */
    public async importUserRules(path: string) {
        const resp = await window.API.Execute(new ImportUserRulesRequest({ path }));
        this.setUserRules(resp);
    }

    /**
     * Reset user rules to defaults
     */
    public async resetUserRules() {
        const resp = await window.API.Execute(new ResetUserRulesRequest());
        this.setUserRules(resp);
    }

    /**
     * Update user rules is enabled
     */
    public updateUserRulesEnabled(data: boolean) {
        const newValue = this.updateHelper();
        newValue.enabled = data;
        this.setUserRules(newValue);
        this.commitUserRules(newValue);
    }

    /**
     * Setter for callback onUserFilterChange
     */
    public setFromCallback(data: UserRulesCallbackState) {
        const newValue = this.updateHelper();
        newValue.rules = data.rules;
        this.setUserRules(newValue);
    }

    /**
     * Decorator that used for debounce calls to platform and ignores all intermediate updates
     * Saves only last element
     */
    private readonly commitUserRules = withLast<UserRulesEnt, OptionalError>(async (data) => {
        return window.API.Execute(new UpdateUserRulesRequest(data));
    }, 'commitUserRules');

    /**
     * private setter
     */
    private setUserRules(data: UserRulesEnt) {
        this.userRules = data;
        this.rules = data.rules.map((r, index) => ({ ...r.toObject() as UserRuleObject, index }));
    }

    /**
     * Private update helper
     */
    private updateHelper() {
        return new UserRulesEnt({
            enabled: this.userRules.enabled,
            rules: this.userRules.rules,
        });
    }
}
