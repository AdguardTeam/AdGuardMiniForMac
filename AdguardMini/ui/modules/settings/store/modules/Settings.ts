// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { LogLevel } from '@adg/webview-utils-kit';
import { makeAutoObservable } from 'mobx';

import { UpdateAllowTelemetryRequest, UpdateConsentRequest } from 'Apis/requests/ConsentService';
import { GetSafariExtensionsRequest } from 'Apis/requests/SafariExtensionsService';
import { ExportLogsRequest, ExportSettingsRequest, ForceRestartOnHardwareAccelerationImportRequest, GetContentBlockersRulesLimitRequest, GetHealthCheckDismissedCardsRequest, GetSettingsRequest, GetUserActionLastDirectoryRequest, ImportSettingsConfirmRequest, ImportSettingsRequest, ResetSettingsRequest, ResetStatisticsRequest, UpdateAutoFiltersUpdateRequest, UpdateDebugLoggingRequest, UpdateHardwareAccelerationRequest, UpdateHealthCheckDismissedCardsRequest, UpdateLaunchOnStartupRequest, UpdateQuitReactionRequest, UpdateShowInMenuBarRequest, UpdateThemeRequest, UpdateUserActionLastDirectoryRequest, UpdateShowSafariToolbarBadgeRequest, UpdatePromoDismissedCardsRequest, GetPromoDismissedCardsRequest } from 'Apis/requests/SettingsService';
import { OpenLoginItemsSettingsRequest } from 'Apis/requests/SystemService';
import { GetEffectiveThemeRequest } from 'Apis/requests/ThemeService/GetEffectiveThemeRequest';
import {
    Settings as SettingsEnt,
    ReleaseVariants,
} from 'Apis/types';
import { SafariExtensionsStore } from 'Common/stores/SafariExtensionsStore';
import { updateLanguage } from 'Intl';

import type { ImportMode, QuitReaction, SafariExtensionUpdate,
    SafariExtensions, EffectiveTheme,
    Theme } from 'Apis/types';

/**
 * App Settings store
 */
export class Settings {
    /**
     * app settings
     */
    public settings = new SettingsEnt();

    /**
     * Effective theme of the settings window.
     */
    public effectiveTheme: EffectiveTheme | null = null;

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
    public dismissedHealthCheckCards = new Set<string>();

    /**
     * Defines dismissed promo cards, contains card ids
     */
    public dismissedPromoCards = new Set<string>();

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
     */
    public constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
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
     * Updates settings
     */
    private commitSettings(data: SettingsEnt) {
        this.setSettings(new SettingsEnt(data));
    }

    /**
     * Private update helper
     */
    private updateHelper() {
        return this.settings.clone();
    }

    /**
     * Applies an optimistic settings mutation and persists it, rolling back
     * the local state (and logging) if the RPC rejects. Prevents the UI from
     * showing a value that was never persisted on a failed save.
     * @param mutate - Applies the change to a cloned settings value.
     * @param persist - The RPC that persists the change; its rejection rolls back.
     */
    private async commitAndPersist(
        mutate: (value: SettingsEnt) => void,
        persist: () => Promise<unknown>,
    ) {
        const previous = this.settings.clone();
        const newValue = this.updateHelper();
        mutate(newValue);
        this.commitSettings(newValue);
        try {
            await persist();
        } catch (err) {
            this.commitSettings(previous);
            // eslint-disable-next-line no-console
            console.error('[settings] update failed; rolled back:', err);
        }
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
        const resp = await window.API.Execute(new GetSettingsRequest());
        this.setSettings(resp);
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
        this.dismissedHealthCheckCards = new Set(cardIds);
    }

    /**
     * Update list of dismissed health check card IDs
     */
    public updateHealthCheckDismissedCards(value: string[]) {
        this.setHealthCheckCardDismissed(value);
        window.API.Execute(new UpdateHealthCheckDismissedCardsRequest({ value }));
    }

    /**
     * Get list of dismissed promo card IDs
     */
    public async getPromoDismissedCards() {
        const resp = await window.API.Execute(new GetPromoDismissedCardsRequest());
        this.setPromoDismissed(resp.value);
    }

    /**
     * Set dismissed promo cards
     */
    public setPromoDismissed(cardIds: string[]) {
        this.dismissedPromoCards = new Set(cardIds);
    }

    /**
     * Update list of dismissed promo card IDs
     */
    public updatePromoDismissedCards(value: string[]) {
        this.setPromoDismissed(value);
        window.API.Execute(new UpdatePromoDismissedCardsRequest({ value }));
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
    public async updateLaunchOnStartup(data: boolean) {
        await this.commitAndPersist(
            (v) => { v.launchOnStartup = data; },
            async () => window.API.Execute(new UpdateLaunchOnStartupRequest({ value: data })),
        );
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
    public async updateShowInMenuBar(data: boolean) {
        await this.commitAndPersist(
            (v) => { v.showInMenuBar = data; },
            async () => window.API.Execute(new UpdateShowInMenuBarRequest({ value: data })),
        );
    }

    /**
     * Update hardwareAcceleration setting
     */
    public async updateHardwareAcceleration(data: boolean) {
        await this.commitAndPersist(
            (v) => { v.hardwareAcceleration = data; },
            async () => window.API.Execute(new UpdateHardwareAccelerationRequest({ value: data })),
        );
    }

    /**
     * Forces an app restart to apply imported hardware-acceleration settings; the UI is restarted.
     */
    public restartAppToApplyHardwareAcceleration() {
        window.API.Execute(new ForceRestartOnHardwareAccelerationImportRequest());
        this.setIncomingHardwareAcceleration(undefined);
    }

    /**
     * Update autoFiltersUpdate setting
     */
    public async updateAutoFiltersUpdate(data: boolean) {
        await this.commitAndPersist(
            (v) => { v.autoFiltersUpdate = data; },
            async () => window.API.Execute(new UpdateAutoFiltersUpdateRequest({ value: data })),
        );
    }

    /**
     * Update quit reaction setting
     */
    public async updateQuitReaction(data: QuitReaction) {
        await this.commitAndPersist(
            (v) => { v.quitReaction = data; },
            async () => window.API.Execute(new UpdateQuitReactionRequest({ reaction: data })),
        );
    }

    /**
     * Update theme
     */
    public async updateTheme(data: Theme) {
        await this.commitAndPersist(
            (v) => { v.theme = data; },
            async () => window.API.Execute(new UpdateThemeRequest({ theme: data })),
        );
    }

    /**
     * Update debugLogging setting
     */
    public async updateDebugLogging(value: boolean) {
        await this.commitAndPersist(
            (v) => { v.debugLogging = value; },
            async () => window.API.Execute(new UpdateDebugLoggingRequest({ value })),
        );
    }

    /**
     * Update showSafariToolbarBadge setting
     * @param value Whether to show the Safari toolbar badge
     */
    public async updateShowSafariToolbarBadge(value: boolean) {
        await this.commitAndPersist(
            (v) => { v.showSafariToolbarBadge = value; },
            async () => window.API.Execute(new UpdateShowSafariToolbarBadgeRequest({ value })),
        );
    }

    /**
     * Update allowTelemetry setting
     */
    public async updateAllowTelemetry(value: boolean) {
        await this.commitAndPersist(
            (v) => { v.allowTelemetry = value; },
            async () => window.API.Execute(new UpdateAllowTelemetryRequest({ value })),
        );
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
     * Get effective theme
     */
    public async getEffectiveTheme() {
        const { value } = await window.API.Execute(new GetEffectiveThemeRequest());
        this.setEffectiveTheme(value);
    }

    /**
     * Setter for effective theme
     */
    public setEffectiveTheme(value: EffectiveTheme) {
        this.effectiveTheme = value;
    }

    /**
     * Setter for the app settings.
     *
     * Also syncs `loginItemEnabled` from the response so the health check
     * card and login item modal reflect the current helper status reported
     * by the platform (`checkHelperStatus`). The tray store already does
     * this; without the sync the settings store only learned the state via
     * the `OnLoginItemStateChange` callback, which fires rarely.
     */
    public setSettings(data: SettingsEnt) {
        this.settings = data;
        this.loginItemEnabled = data.loginItemEnabled ?? true;
        updateLanguage(data.language);
        log.setLogLevel(data.debugLogging ? LogLevel.DBG : LogLevel.ERR);
    }

    /**
     * Setter for incoming hardware acceleration
     */
    public setIncomingHardwareAcceleration(data: boolean | undefined) {
        this.incomeHardwareAcceleration = data;
    }
}
