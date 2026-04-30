// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { LogLevel } from '@adg/sciter-utils-kit';
import { makeAutoObservable } from 'mobx';

import {
    UserConsent,
    EmptyValue,
    Path,
    Settings as SettingsEnt,
    BoolValue,
    UpdateQuitReactionMessage,
    ImportSettingsConfirmation,
    ReleaseVariants,
    StringValue,
    UpdateThemeMessage,
} from 'Apis/types';
import { SafariExtensionsStore } from 'Common/stores/SafariExtensionsStore';
import { updateLanguage } from 'Intl';

import type { ImportMode, QuitReaction, SafariExtensionUpdate, Theme,
    SafariExtensions } from 'Apis/types';
import type { SettingsStore } from 'SettingsStore';

import { SciterWindowId } from './Windowing';

/**
 * App Settings store
 */
export class Settings {
    rootStore: SettingsStore;

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
     * Setter for login item state
     */
    public setLoginItem(state: boolean) {
        this.loginItemEnabled = state;
    }

    /**
     * Open settings login item
     */
    public openLoginItemsSettings() {
        window.API.settingsService.OpenLoginItemsSettings(new EmptyValue());
    }

    /**
     * Get app settings
     */
    public async getSettings() {
        const resp = await window.API.settingsService.GetSettings(new EmptyValue());
        this.setSettings(resp);
    }

    /**
     * Get user action last directory
     */
    public async getUserActionLastDirectory() {
        const resp = await window.API.settingsService.GetUserActionLastDirectory(new EmptyValue());
        this.setUserActionLastDirectory(resp.value);
    }

    /**
     * Update user action last directory
     */
    public updateUserActionLastDirectory(value: string) {
        window.API.settingsService.UpdateUserActionLastDirectory(new StringValue({ value }));
        this.setUserActionLastDirectory(value);
    }

    /**
     * Private setter for user action last directory
     */
    private setUserActionLastDirectory(value: string) {
        this.userActionLastDirectory = value;
    }

    /**
     * Export settings to selected destination
     * @param path path to save file
     */
    public async exportSettings(path: string) {
        return window.API.settingsService.ExportSettings(new Path({ path }));
    }

    /**
     * Import app settings from selected destination
     * @param path path to read file
     */
    public async importSettings(path: string) {
        await window.API.settingsService.ImportSettings(new Path({ path }));
    }

    /**
     * Reset settings to defaults
     */
    public async resetSettings() {
        const resp = await window.API.settingsService.ResetSettings(new EmptyValue());
        this.setSettings(resp);
    }

    /**
     * Update launchOnStartup setting
     */
    public updateLaunchOnStartup(data: boolean) {
        const newValue = this.updateHelper();
        newValue.launchOnStartup = data;
        window.API.settingsService.UpdateLaunchOnStartup(new BoolValue({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Get safari protection status
     */
    public async getSafariExtensions() {
        const [ext, limit] = await Promise.all([
            window.API.settingsService.GetSafariExtensions(new EmptyValue()),
            window.API.settingsService.GetContentBlockersRulesLimit(new EmptyValue()),
        ]);
        this.setSafariExtensions(ext);
        this.setContentBlockersRulesLimit(limit.value);
    }

    /**
     * Setter for contentBlockersRulesLimit
     */
    private setContentBlockersRulesLimit(value: number) {
        this.contentBlockersRulesLimit = value;
    }

    /**
     * Getter for safari extensions with loading status
     */
    public get safariExtensionsLoading() {
        return this.safariExtensionsStore.safariExtensionsLoading;
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
        window.API.settingsService.UpdateShowInMenuBar(new BoolValue({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update hardwareAcceleration setting
     */
    public updateHardwareAcceleration(data: boolean) {
        const newValue = this.updateHelper();
        newValue.hardwareAcceleration = data;
        window.API.settingsService.UpdateHardwareAcceleration(new BoolValue({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Force restart sciter, used when hardware acceleration is imported, ui will be restarted
     */
    public restartAppToApplyHardwareAcceleration() {
        window.API.settingsService.ForceRestartOnHardwareAccelerationImport(new EmptyValue());
        this.setIncomingHardwareAcceleration(undefined);
    }

    /**
     * Update autoFiltersUpdate setting
     */
    public updateAutoFiltersUpdate(data: boolean) {
        const newValue = this.updateHelper();
        newValue.autoFiltersUpdate = data;
        window.API.settingsService.UpdateAutoFiltersUpdate(new BoolValue({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update realTimeFiltersUpdate setting
     */
    public updateRealTimeFiltersUpdate(data: boolean) {
        const newValue = this.updateHelper();
        newValue.realTimeFiltersUpdate = data;
        window.API.settingsService.UpdateRealTimeFiltersUpdate(new BoolValue({ value: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update quit reaction setting
     */
    public updateQuitReaction(data: QuitReaction) {
        const newValue = this.updateHelper();
        newValue.quitReaction = data;
        window.API.settingsService.UpdateQuitReaction(new UpdateQuitReactionMessage({ reaction: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update theme
     */
    public updateTheme(data: Theme) {
        const newValue = this.updateHelper();
        newValue.theme = data;
        window.API.settingsService.UpdateTheme(new UpdateThemeMessage({ theme: data }));
        this.commitSettings(newValue);
    }

    /**
     * Update debugLogging setting
     */
    public updateDebugLogging(value: boolean) {
        const newValue = this.updateHelper();
        window.API.settingsService.UpdateDebugLogging(new BoolValue({ value }));
        newValue.debugLogging = value;
        this.commitSettings(newValue);
    }

    /**
     * Update showSafariToolbarBadge setting
     * @param value Whether to show the Safari toolbar badge
     */
    public updateShowSafariToolbarBadge(value: boolean) {
        const newValue = this.updateHelper();
        window.API.settingsService.UpdateShowSafariToolbarBadge(new BoolValue({ value }));
        newValue.showSafariToolbarBadge = value;
        this.commitSettings(newValue);
    }

    /**
     * Update allowTelemetry setting
     */
    public updateAllowTelemetry(value: boolean) {
        const newValue = this.updateHelper();
        window.API.settingsService.UpdateAllowTelemetry(new BoolValue({ value }));
        newValue.allowTelemetry = value;
        this.commitSettings(newValue);
    }

    /**
     * Export logs to selected destination
     * @param path path to save file
     */
    public async exportLogs(path: string) {
        const error = await window.API.settingsService.ExportLogs(new Path({ path }));
        if (error.hasError) {
            return error;
        }
    }

    /**
     * Updater for user consent
     */
    public async updateUserConsent(data: number[]) {
        await window.API.settingsService.UpdateConsent(new UserConsent({ filtersIds: data }));
        const settings = this.updateHelper();
        settings.consentFiltersIds = data;
        this.setSettings(settings);
    }

    /**
     * Confirm type of import
     */
    public confirmImport(mode: ImportMode) {
        this.confirmMode = mode;
        window.API.settingsService.ImportSettingsConfirm(new ImportSettingsConfirmation({ mode }));
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
        window.API.settingsService.ResetStatistics(new EmptyValue());
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
     * Updates settings
     */
    private commitSettings(data: SettingsEnt) {
        this.setSettings(new SettingsEnt(data));
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
            this.rootStore.windowing.setSavedGeometry(SciterWindowId.USER_RULE_EDITOR, {
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

    /**
     * Private update helper
     */
    private updateHelper() {
        return this.settings.clone();
    }
}
