// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { updateLanguage } from 'Intl';

import type { UserRule } from 'Common/apis/types';

/** User-rules editor store. */
class EditorStore {
    private $rules: UserRule[] = [];

    private $loadedRules: UserRule[] = [];

    private $loading = true;

    private $isDirty = false;

    private $language = 'en';

    /** Whether the engine-level user-rules enabled flag is on (proto
     *  `UserRules.enabled`). Preserved across load/save so Save does not
     *  hardcode `true` and revert the user's toggle. */
    private $enabled = true;

    /** Rules pushed from the Assistant while the editor had unsaved edits. */
    private $pendingRules: UserRule[] | null = null;

    private $isApplyingUpdates = false;

    private $justSaved = false;

    /** Working rule set. */
    public get rules() {
        return this.$rules;
    }

    /** Returns the engine-level user-rules enabled flag. */
    public get enabled() {
        return this.$enabled;
    }

    /** Last loaded rule set. */
    public get loadedRules() {
        return this.$loadedRules;
    }

    /** Current loading state. */
    public get loading() {
        return this.$loading;
    }

    /** Unsaved-changes flag. */
    public get isDirty() {
        return this.$isDirty;
    }

    /** Rules pushed from the Assistant awaiting an apply decision. */
    public get pendingRules() {
        return this.$pendingRules;
    }

    /** Whether pending Assistant updates are being applied. */
    public get isApplyingUpdates() {
        return this.$isApplyingUpdates;
    }

    /** Whether the working set was just saved (shows the saved hint). */
    public get justSaved() {
        return this.$justSaved;
    }

    /** Empty-rules flag. */
    public get isEmpty() {
        return this.$rules.length === 0;
    }

    /** Editor language. */
    public get language() {
        return this.$language;
    }

    /** Ctor. */
    constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
    }

    /** Load rules from RPC into store. */
    public loadRules(rules: UserRule[], enabled = true) {
        // Copy the loaded array so the load-signal and working-set stay
        // independent even if a consumer ever mutates `this.$rules` in place.
        this.$loadedRules = rules;
        this.$rules = [...rules];
        this.$enabled = enabled;
    }

    /** Update working rules from editor changes. */
    public setRules(rules: UserRule[]) {
        this.$rules = rules;
    }

    /** Whether `candidate` equals the current working set (same order, rule
     *  text, and enabled flag). Cheap O(n) compare used to skip re-seeding
     *  the editor when a callback echoes the rules it just saved — re-seeding
     *  rebuilds the whole CodeMirror document synchronously and blocks the
     *  WebContent main thread for large rule sets.
     */
    public hasSameRules(candidate: UserRule[]): boolean {
        const current = this.$rules;
        if (current.length !== candidate.length) {
            return false;
        }
        for (let i = 0; i < current.length; i += 1) {
            if (current[i].rule !== candidate[i].rule
                || current[i].enabled !== candidate[i].enabled) {
                return false;
            }
        }
        return true;
    }

    /** Update loading flag. */
    public setLoading(flag: boolean) {
        this.$loading = flag;
    }

    /** Update dirty flag. Editing again drops the "saved" hint. */
    public setIsDirty(flag: boolean) {
        this.$isDirty = flag;
        if (flag) {
            this.$justSaved = false;
        }
    }

    /** Store (or clear) rules pushed from the Assistant. */
    public setPendingRules(rules: UserRule[] | null) {
        this.$pendingRules = rules;
    }

    /** Mark the working set as saved. */
    public setJustSaved(flag: boolean) {
        this.$justSaved = flag;
    }

    /** Apply the pending Assistant rules, discarding the local edits. */
    public applyPendingRules() {
        const pending = this.$pendingRules;
        if (!pending) {
            return;
        }
        this.$isApplyingUpdates = true;
        this.$pendingRules = null;
        // `loadRules` re-seeds the editor through the `loadedRules` effect,
        // which ends the applying state once CodeMirror has been rebuilt.
        this.loadRules(pending, this.$enabled);
    }

    /** End the applying state once the editor has been re-seeded. */
    public finishApplyingUpdates() {
        this.$isApplyingUpdates = false;
    }

    /** Update editor language and translator language. */
    public setLanguage(language: string) {
        this.$language = language;
        updateLanguage(language);
    }
}

export const editorStore = new EditorStore();
