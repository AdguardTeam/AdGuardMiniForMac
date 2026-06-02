// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { LogLevel } from '@adg/sciter-utils-kit';
import { makeAutoObservable } from 'mobx';

import { GetSafariExtensionsRequest, UpdateConsentRequest } from 'Apis/requests/CommonService';
import { ExportLogsRequest, ExportSettingsRequest, ForceRestartOnHardwareAccelerationImportRequest, GetContentBlockersRulesLimitRequest, GetHealthCheckDismissedCardsRequest, GetSettingsRequest, GetUserActionLastDirectoryRequest, ImportSettingsConfirmRequest, ImportSettingsRequest, OpenLoginItemsSettingsRequest, ResetSettingsRequest, ResetStatisticsRequest, UpdateAllowTelemetryRequest, UpdateAutoFiltersUpdateRequest, UpdateDebugLoggingRequest, UpdateHardwareAccelerationRequest, UpdateHealthCheckDismissedCardsRequest, UpdateLaunchOnStartupRequest, UpdateQuitReactionRequest, UpdateRealTimeFiltersUpdateRequest, UpdateShowInMenuBarRequest, UpdateThemeRequest, UpdateUserActionLastDirectoryRequest, UpdateShowSafariToolbarBadgeRequest } from 'Apis/requests/SettingsService';
import {
    Settings as SettingsEnt,
    ReleaseVariants,
} from 'Apis/types';
import { SafariExtensionsStore } from 'Common/stores/SafariExtensionsStore';
import { updateLanguage } from 'Intl';

import { SciterWindowId, type Windowing } from './Windowing';

import type { ImportMode, QuitReaction, SafariExtensionUpdate, Theme,
    SafariExtensions } from 'Apis/types';

/**
 * App Settings store
 */
export class Settings {
    /**
     * Reference to the windowing store for geometry persistence
     */
    private readonly windowing: Windowing;

    /**
     * app settings
     */
    public settings = new SettingsEnt();

    /**
     * Bool describes if login item is enabled
     */
    public loginItemEnabled = true;

    /**
     * Safari extensions store
     */
    public safariExtensionsStore = new SafariExtensionsStore();

    /**
     * Contains ids of filters that should be imported with consent
     */
    public shouldGiveConsent: number[] = [];

    /**
     * Confirm mode of import
     * We save this mode to show notification after import
     */
    public confirmMode: ImportMode | undefined;

    /**
     * Defines max rules number in safari extension
     */
    public contentBlockersRulesLimit: number = 50000;

    /**
     * Defines incoming hardware acceleration
     */
    public incomeHardwareAcceleration: boolean | undefined;

    /**
     * Defines last user action directory
     */
    public userActionLastDirectory: string | undefined;

    /**
     * Defines dismissed health check cards, contains card ids
     */
    public dissmissedHealthCheckCards = new Set<string>();

    /**
     * Getter for safari extensions with loading status
     */
    public get safariExtensionsLoading() {
        return this.safariExtensionsStore.safariExtensionsLoading;
    }

    /**
     * Checks if the app release variant is the MAS
     */
    public get isMASReleaseVariant() {
        return this.settings.releaseVariant === ReleaseVariants.MAS;
    }

    /**
     * Checks if the app release variant is the standalone
     */
    public get isStandaloneReleaseVariant() {
        return this.settings.releaseVariant === ReleaseVariants.standAlone;
    }

    /**
     * Ctor
     *
     * @param rootStore
     */
    public constructor(windowing: Windowing) {
        this.windowing = windowing;
        makeAutoObservable(this, {}, { autoBind: true });
    }

    /**
     * Private setter for user action last directory
     */
    private setUserActionLastDirectory(value: string) {
        this.userActionLastDirectory = value;
    }

    /**
     * Setter for contentBlockersRulesLimit
     */
    private setContentBlockersRulesLimit(value: number) {
        this.contentBlockersRulesLimit = value;
    }

    /**
     * Private update helper
     */
    private updateHelper() {
        return this.settings.clone();
    }

    /**
     * Updates settings
     */
    private commitSettings(data: SettingsEnt) {
        this.setSettings(new SettingsEnt(data));
    }

    /**
     * Setter for login item state
     */
    public setLoginItem(state: boolean) {
        this.loginItemEnabled = state;
    }

    /**
     * Open settings login item
     */
    public openLoginItemsSettings() {
        window.API.Execute(new OpenLoginItemsSettingsRequest());
    }

    /**
     * Get app settings
     */
    public async getSettings() {
        try {
            const resp = await window.API.Execute(new GetSettingsRequest());
            this.setSettings(resp);
        } catch (err) {
            log.error('getSettings failed', String(err));
        }
    }

    /**
     * Get list of dismissed health check card IDs
     */
    public async getHealthCheckDismissedCards() {
        const resp = await window.API.Execute(new GetHealthCheckDismissedCardsRequest());
        this.setHealthCheckCardDismissed(resp.value);
    }

    /**
     *
     */
    public setHealthCheckCardDismissed(cardIds: string[]) {
        this.dissmissedHealthCheckCards = new Set(cardIds);
    }

    /**
     * Update list of dismissed health check card IDs
     */
    public updateHealthCheckDismissedCards(value: string[]) {
        this.setHealthCheckCardDismissed(value);
        window.API.Execute(new UpdateHealthCheckDismissedCardsRequest({ value }));
    }

    /**
     * Get user action last directory
     */
    public async getUserActionLastDirectory() {
        const resp = await window.API.Execute(new GetUserActionLastDirectoryRequest());
        this.setUserActionLastDirectory(resp.value);
    }

    /**
     * Update user action last directory
     */
    public updateUserActionLastDirectory(value: string) {
        window.API.Execute(new UpdateUserActionLastDirectoryRequest({ value }));
        this.setUserActionLastDirectory(value);
    }

    /**
     * Export settings to selected destination
     * @param path path to save file
     */
    public async exportSettings(path: string) {
        return window.API.Execute(new ExportSettingsRequest({ path }));
    }

    /**
     * Import app settings from selected destination
     * @param path path to read file
     */
    public async importSettings(path: string) {
        await window.API.Execute(new ImportSettingsRequest({ path }));
    }

    /**
     * Reset settings to defaults
     */
    public async resetSettings() {
        const resp = await window.API.Execute(new ResetSettingsRequest());
        this.setSettings(resp);
    }

    /**
     * Update launchOnStartup setting
     */
    public updateLaunchOnStartup(data: boolean) {
        const newValue = this.updateHelper();
        newValue.launchOnStartup = data;
        window.API.Execute(new UpdateLaunchOnStartupRequest({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Get safari protection status
     */
    public async getSafariExtensions() {
        const [ext, limit] = await Promise.all([
            window.API.Execute(new GetSafariExtensionsRequest()),
            window.API.Execute(new GetContentBlockersRulesLimitRequest()),
        ]);
        this.setSafariExtensions(ext);
        this.setContentBlockersRulesLimit(limit.value);
    }

    /**
     * Updates safari extension (facade to safariExtensionsStore)
     */
    public updateSafariExtension(data: SafariExtensionUpdate) {
        this.safariExtensionsStore.updateSafariExtension(data);
    }

    /**
     * Set safari protection status (facade to safariExtensionsStore)
     */
    public setSafariExtensions(data: SafariExtensions) {
        this.safariExtensionsStore.setSafariExtensions(data);
    }

    /**
     * Update showInMenuBar setting
     */
    public updateShowInMenuBar(data: boolean) {
        const newValue = this.updateHelper();
        newValue.showInMenuBar = data;
        window.API.Execute(new UpdateShowInMenuBarRequest({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update hardwareAcceleration setting
     */
    public updateHardwareAcceleration(data: boolean) {
        const newValue = this.updateHelper();
        newValue.hardwareAcceleration = data;
        window.API.Execute(new UpdateHardwareAccelerationRequest({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Force restart sciter, used when hardware acceleration is imported, ui will be restarted
     */
    public restartAppToApplyHardwareAcceleration() {
        window.API.Execute(new ForceRestartOnHardwareAccelerationImportRequest());
        this.setIncomingHardwareAcceleration(undefined);
    }

    /**
     * Update autoFiltersUpdate setting
     */
    public updateAutoFiltersUpdate(data: boolean) {
        const newValue = this.updateHelper();
        newValue.autoFiltersUpdate = data;
        window.API.Execute(new UpdateAutoFiltersUpdateRequest({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update realTimeFiltersUpdate setting
     */
    public updateRealTimeFiltersUpdate(data: boolean) {
        const newValue = this.updateHelper();
        newValue.realTimeFiltersUpdate = data;
        window.API.Execute(new UpdateRealTimeFiltersUpdateRequest({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update quit reaction setting
     */
    public updateQuitReaction(data: QuitReaction) {
        const newValue = this.updateHelper();
        newValue.quitReaction = data;
        window.API.Execute(new UpdateQuitReactionRequest({ reaction: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update theme
     */
    public updateTheme(data: Theme) {
        const newValue = this.updateHelper();
        newValue.theme = data;
        window.API.Execute(new UpdateThemeRequest({ theme: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update debugLogging setting
     */
    public updateDebugLogging(value: boolean) {
        const newValue = this.updateHelper();
        window.API.Execute(new UpdateDebugLoggingRequest({ value }));
        newValue.debugLogging = value;
        this.commitSettings(newValue);
    }

    /**
     * Update showSafariToolbarBadge setting
     * @param value Whether to show the Safari toolbar badge
     */
    public updateShowSafariToolbarBadge(value: boolean) {
        const newValue = this.updateHelper();
        window.API.Execute(new UpdateShowSafariToolbarBadgeRequest({ value }));
        newValue.showSafariToolbarBadge = value;
        this.commitSettings(newValue);
    }

    /**
     * Update allowTelemetry setting
     */
    public updateAllowTelemetry(value: boolean) {
        const newValue = this.updateHelper();
        window.API.Execute(new UpdateAllowTelemetryRequest({ value }));
        newValue.allowTelemetry = value;
        this.commitSettings(newValue);
    }

    /**
     * Export logs to selected destination
     * @param path path to save file
     */
    public async exportLogs(path: string) {
        const error = await window.API.Execute(new ExportLogsRequest({ path }));
        if (error.hasError) {
            return error;
        }
    }

    /**
     * Updater for user consent
     */
    public async updateUserConsent(data: number[]) {
        await window.API.Execute(new UpdateConsentRequest({ filtersIds: data }));
        const settings = this.updateHelper();
        settings.consentFiltersIds = data;
        this.setSettings(settings);
    }

    /**
     * Confirm type of import
     */
    public confirmImport(mode: ImportMode) {
        this.confirmMode = mode;
        window.API.Execute(new ImportSettingsConfirmRequest({ mode }));
    }

    /**
     * Setter for shouldGiveConsent
     */
    public setShouldGiveConsent(data: number[]) {
        this.shouldGiveConsent = data;
    }

    /**
     * Clear statistics
     */
    public clearStatistics() {
        window.API.Execute(new ResetStatisticsRequest());
    }

    /**
     * On import success
     */
    public onImportSuccess() {
        this.confirmMode = undefined;
        this.shouldGiveConsent = [];
        this.getSettings();
    }

    /**
     * private setter
     */
    public setSettings(data: SettingsEnt) {
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

    /**
     * Setter for incoming hardware acceleration
     */
    public setIncomingHardwareAcceleration(data: boolean | undefined) {
        this.incomeHardwareAcceleration = data;
    }
}
