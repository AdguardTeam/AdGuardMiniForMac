// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { updateLanguage } from 'Intl';

/**
 * Store for the User rules editor
 */
class EditorStore {
    private $chunkLoading = false;

    private $loading = false;

    private $isDirty = false;

    private $language = 'en';

    private $exportValue = '';

    private $editorValue = '';

    private $draftValue = '';

    /**
     * Returns the current loading state of the editor.
     */
    public get loading() {
        return this.$loading;
    }

    /**
     * Returns the current language of the editor.
     */
    public get language() {
        return this.$language;
    }

    /**
     * Indicates if there are unsaved changes in the editor
     */
    public get isDirty() {
        return this.$isDirty;
    }

    /**
     * Indicates if the chunk loading is in progress
     */
    public get chunkLoading() {
        return this.$chunkLoading;
    }

    /**
     * Represents the value that should be exported from the editor
     */
    public get exportValue() {
        return this.$exportValue;
    }

    /**
     * Represents the current value in the editor
     */
    public get editorValue() {
        return this.$editorValue;
    }

    /**
     * Represents the temporary or "draft" value in the editor
     */
    public get draftValue() {
        return this.$draftValue;
    }

    /**
     * Ctor
     */
    constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
    }

    /**
     * Updates the language of the editor.
     * @param {string} language - The new language for the editor.
     */
    public setLanguage(language: string) {
        this.$language = language;
        updateLanguage(language);
    }

    /**
     * Updates the 'chunkLoading' flag.
     * @param {boolean} flag - The new value for the 'chunkLoading' flag.
     */
    public setChunkLoading(flag: boolean) {
        this.$chunkLoading = flag;
    }

    /**
     * Updates the 'loading' flag.
     * @param {boolean} flag - The new value for the 'loading' flag.
     */
    public setLoading(flag: boolean) {
        this.$loading = flag;
    }

    /**
     * Updates the 'isDirty' flag.
     * @param {boolean} flag - The new value for the 'isDirty' flag.
     */
    public setIsDirty(flag: boolean) {
        this.$isDirty = flag;
    }

    /**
     * Updates the value to be exported from the editor.
     * @param {string} value - The new value to be exported.
     */
    public setExportValue(value: string) {
        this.$exportValue = value;
    }

    /**
     * Updates the current value in the editor.
     * @param {string} value - The new value for the editor.
     */
    public setEditorValue(value: string) {
        this.$editorValue = value;
    }

    /**
     * Appends the new value to the current value in the editor.
     * @param {string} value - The new value for the editor.
     */
    public appendEditorValue(value: string) {
        this.$editorValue += value;
    }

    /**
     * Updates the draft value in the editor.
     * @param {string} value - The new draft value for the editor.
     */
    public setDraftValue(value: string) {
        this.$draftValue = value;
    }
}

export const editorStore = new EditorStore();
