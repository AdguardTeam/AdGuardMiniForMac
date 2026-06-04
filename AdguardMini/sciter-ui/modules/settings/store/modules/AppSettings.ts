// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppSettings.ts
//  AdguardMini
//

import { LogLevel } from '@adg/sciter-utils-kit';
import { makeAutoObservable } from 'mobx';

import { UpdateConsentRequest } from 'Apis/requests/CommonService/UpdateConsentRequest';
import { GetHealthCheckDismissedCardsRequest, GetContentBlockersRulesLimitRequest, GetSettingsRequest, GetUserActionLastDirectoryRequest, UpdateAllowTelemetryRequest, UpdateAutoFiltersUpdateRequest, UpdateDebugLoggingRequest, UpdateHardwareAccelerationRequest, UpdateHealthCheckDismissedCardsRequest, UpdateLaunchOnStartupRequest, UpdateQuitReactionRequest, UpdateRealTimeFiltersUpdateRequest, UpdateShowInMenuBarRequest, UpdateShowSafariToolbarBadgeRequest, UpdateThemeRequest, UpdateUserActionLastDirectoryRequest, OpenLoginItemsSettingsRequest, ForceRestartOnHardwareAccelerationImportRequest, ResetStatisticsRequest, ResetSettingsRequest, ExportLogsRequest } from 'Apis/requests/SettingsService';
import { ReleaseVariants, Settings as SettingsEnt } from 'Apis/types';
import { updateLanguage } from 'Intl';

import { SciterWindowId, type Windowing } from './Windowing';

import type { QuitReaction, Theme } from 'Apis/types';

/**
 * App-level settings CRUD — individual toggle methods for each setting.
 */
export class AppSettings {
    // This should be private but due to MobX typings we make it public or we have error in makeAutoObservable
    public readonly windowing: Windowing;

    /**
     * App settings state
     */
    public settings = new SettingsEnt();

    /**
     * Bool describes if login item is enabled
     */
    public loginItemEnabled = true;

    /**
     * Defines incoming hardware acceleration change
     */
    public incomeHardwareAcceleration: boolean | undefined;

    /**
     * Defines last user action directory
     */
    public userActionLastDirectory: string | undefined;

    /**
     * Defines dismissed health check cards
     */
    public dissmissedHealthCheckCards = new Set<string>();

    /**
     * Contains ids of filters that should be imported with consent
     */
    public shouldGiveConsent: number[] = [];

    /**
     * Defines max rules number in safari extension
     */
    public contentBlockersRulesLimit: number = 50000;

    /**
     * Bool describes if this is Mas release variant
     */
    public get isMasReleaseVariant(): boolean {
        return this.settings.releaseVariant === ReleaseVariants.MAS;
    }

    /**
     * Bool describes if this is Mas release variant
     */
    public get isStandaloneReleaseVariant(): boolean {
        return this.settings.releaseVariant === ReleaseVariants.standAlone;
    }

    /**
     * Ctor
     *
     * @param windowing Windowing store for geometry persistence
     */
    constructor(windowing: Windowing) {
        this.windowing = windowing;
        makeAutoObservable(this, {
            windowing: false,
        }, { autoBind: true });
        this.getContentBlockersRulesLimit();
    }

    /**
     * Private setter for user action last directory
     */
    private setUserActionLastDirectory(value: string): void {
        this.userActionLastDirectory = value;
    }

    /**
     * Private update helper — clones current settings for mutation
     */
    private updateHelper(): SettingsEnt {
        return this.settings.clone();
    }

    /**
     * Commit updated settings
     */
    private commitSettings(data: SettingsEnt): void {
        this.setSettings(new SettingsEnt(data));
    }

    /**
     * Setter for contentBlockersRulesLimit
     */
    private setContentBlockersRulesLimit(value: number) {
        this.contentBlockersRulesLimit = value;
    }

    /**
     * Setter for contentBlockersRulesLimit
     */
    public async getContentBlockersRulesLimit() {
        const ext = await window.API.Execute(new GetContentBlockersRulesLimitRequest());
        this.setContentBlockersRulesLimit(ext.value);
    }

    /**
     * Setter for login item state
     */
    public setLoginItem(state: boolean): void {
        this.loginItemEnabled = state;
    }

    /**
     * Open settings login item
     */
    public openLoginItemsSettings(): void {
        window.API.Execute(new OpenLoginItemsSettingsRequest());
    }

    /**
     * Get app settings
     */
    public async getSettings(): Promise<void> {
        try {
            const resp = await window.API.Execute(new GetSettingsRequest());
            this.setSettings(resp);
        } catch (err) {
            log.error('AppSettings.getSettings failed', String(err));
        }
    }

    /**
     * Get list of dismissed health check card IDs
     */
    public async getHealthCheckDismissedCards(): Promise<void> {
        const resp = await window.API.Execute(new GetHealthCheckDismissedCardsRequest());
        this.setHealthCheckCardDismissed(resp.value);
    }

    /**
     * Set dismissed health check cards
     */
    public setHealthCheckCardDismissed(cardIds: string[]): void {
        this.dissmissedHealthCheckCards = new Set(cardIds);
    }

    /**
     * Update list of dismissed health check card IDs
     */
    public updateHealthCheckDismissedCards(value: string[]): void {
        this.setHealthCheckCardDismissed(value);
        window.API.Execute(new UpdateHealthCheckDismissedCardsRequest({ value }));
    }

    /**
     * Get user action last directory
     */
    public async getUserActionLastDirectory(): Promise<void> {
        const resp = await window.API.Execute(new GetUserActionLastDirectoryRequest());
        this.setUserActionLastDirectory(resp.value);
    }

    /**
     * Update user action last directory
     */
    public updateUserActionLastDirectory(value: string): void {
        window.API.Execute(new UpdateUserActionLastDirectoryRequest({ value }));
        this.setUserActionLastDirectory(value);
    }

    // -- Individual setting update methods --

    /**
     * Update launchOnStartup setting
     */
    public updateLaunchOnStartup(data: boolean): void {
        const newValue = this.updateHelper();
        newValue.launchOnStartup = data;
        window.API.Execute(new UpdateLaunchOnStartupRequest({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update showInMenuBar setting
     */
    public updateShowInMenuBar(data: boolean): void {
        const newValue = this.updateHelper();
        newValue.showInMenuBar = data;
        window.API.Execute(new UpdateShowInMenuBarRequest({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update hardwareAcceleration setting
     */
    public updateHardwareAcceleration(data: boolean): void {
        const newValue = this.updateHelper();
        newValue.hardwareAcceleration = data;
        window.API.Execute(new UpdateHardwareAccelerationRequest({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Force restart sciter for hardware acceleration import
     */
    public restartAppToApplyHardwareAcceleration(): void {
        window.API.Execute(new ForceRestartOnHardwareAccelerationImportRequest());
        this.setIncomingHardwareAcceleration(undefined);
    }

    /**
     * Update autoFiltersUpdate setting
     */
    public updateAutoFiltersUpdate(data: boolean): void {
        const newValue = this.updateHelper();
        newValue.autoFiltersUpdate = data;
        window.API.Execute(new UpdateAutoFiltersUpdateRequest({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update realTimeFiltersUpdate setting
     */
    public updateRealTimeFiltersUpdate(data: boolean): void {
        const newValue = this.updateHelper();
        newValue.realTimeFiltersUpdate = data;
        window.API.Execute(new UpdateRealTimeFiltersUpdateRequest({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update quit reaction setting
     */
    public updateQuitReaction(data: QuitReaction): void {
        const newValue = this.updateHelper();
        newValue.quitReaction = data;
        window.API.Execute(new UpdateQuitReactionRequest({ reaction: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update theme
     */
    public updateTheme(data: Theme): void {
        const newValue = this.updateHelper();
        newValue.theme = data;
        window.API.Execute(new UpdateThemeRequest({ theme: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update debugLogging setting
     */
    public updateDebugLogging(value: boolean): void {
        const newValue = this.updateHelper();
        window.API.Execute(new UpdateDebugLoggingRequest({ value }));
        newValue.debugLogging = value;
        this.commitSettings(newValue);
    }

    /**
     * Update showSafariToolbarBadge setting
     */
    public updateShowSafariToolbarBadge(value: boolean): void {
        const newValue = this.updateHelper();
        window.API.Execute(new UpdateShowSafariToolbarBadgeRequest({ value }));
        newValue.showSafariToolbarBadge = value;
        this.commitSettings(newValue);
    }

    /**
     * Update allowTelemetry setting
     */
    public updateAllowTelemetry(value: boolean): void {
        const newValue = this.updateHelper();
        window.API.Execute(new UpdateAllowTelemetryRequest({ value }));
        newValue.allowTelemetry = value;
        this.commitSettings(newValue);
    }

    /**
     * Set incoming hardware acceleration flag
     */
    public setIncomingHardwareAcceleration(value: boolean | undefined): void {
        this.incomeHardwareAcceleration = value;
    }

    /**
         * Updater for user consent
         */
    public async updateUserConsent(data: number[]): Promise<void> {
        await window.API.Execute(new UpdateConsentRequest({ filtersIds: data }));
        const settings = this.settings.clone();
        settings.consentFiltersIds = data;
        this.setSettings(settings);
    }

    /**
     * Setter for shouldGiveConsent
     */
    public setShouldGiveConsent(data: number[]): void {
        this.shouldGiveConsent = data;
    }

    /**
     * Clear statistics
     */
    public clearStatistics(): void {
        window.API.Execute(new ResetStatisticsRequest());
    }

    /**
     * Reset settings to defaults
     */
    public async resetSettings(): Promise<void> {
        const resp = await window.API.Execute(new ResetSettingsRequest());
        this.setSettings(resp);
    }

    /**
     * Export logs to selected destination
     */
    public async exportLogs(path: string) {
        const error = await window.API.Execute(new ExportLogsRequest({ path }));
        if (error.hasError) {
            return error;
        }
    }

    /**
     * Set settings and propagate theme/language changes
     */
    public setSettings(data: SettingsEnt): void {
        this.settings = data;
        updateLanguage(data.language);
        log.setLogLevel(data.debugLogging ? LogLevel.DBG : LogLevel.ERR);

        if (data.has_user_rules_editor_geometry) {
            const geo = data.userRulesEditorGeometry;
            this.windowing.setSavedGeometry(SciterWindowId.USER_RULE_EDITOR, {
                x: geo.x,
                y: geo.y,
                width: geo.width,
                height: geo.height,
                monitor: geo.monitor,
            });
        }
    }
}
