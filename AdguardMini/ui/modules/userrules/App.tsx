// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'preact/hooks';

import {
    CloseUserRulesWindowRequest,
    GetSystemLanguageRequest,
    reportAnIssueRequest,
} from 'Apis/requests/InternalService';
import { RecordEventRequest } from 'Apis/requests/TelemetryService';
import { GetUserRulesRequest, UpdateUserRulesRequest } from 'Apis/requests/UserRulesService';
import { UserRules, PageView, CustomTelemetryEvent } from 'Apis/types';
import { UserRulesPages, UserRulesEvents } from 'Common/utils/consts';

import s from './App.module.pcss';
import { Editor } from './Editor';
import { editorStore } from './editorStore';
import { FaqIcon } from './FaqIcon';
import { FlagIcon } from './FlagIcon';
import { useTheme } from './lib/hooks/useTheme';
import { Loader } from './Loader';
import { UnsavedChangesModal } from './UnsavedChangesModal';

const DNS_FILTERING_KB_URL = 'https://kb.adguard.com/general/dns-filtering';

/** User rules screen with editor. */
function AppComponent() {
    // Apply effective color theme to `<html>`.
    useTheme();

    const hotkeys = [
        { label: translate('user.rules.editor.hotkeys.toggle.rule'), hotkey: 'Cmd + /' },
        { label: translate('user.rules.editor.hotkeys.find'), hotkey: 'Cmd + F' },
        { label: translate('user.rules.editor.hotkeys.find.and.replace'), hotkey: 'Cmd + R' },
        { label: translate('user.rules.editor.hotkeys.delete.line'), hotkey: 'Cmd + D' },
        { label: translate('user.rules.editor.hotkeys.move.line.down'), hotkey: 'Opt + ↓' },
        { label: translate('user.rules.editor.hotkeys.move.line.up'), hotkey: 'Opt + ↑' },
        { label: translate('user.rules.editor.hotkeys.copy.line.down'), hotkey: 'Opt + Shift + ↓' },
        { label: translate('user.rules.editor.hotkeys.copy.line.up'), hotkey: 'Opt + Shift + ↑' },
        { label: translate('user.rules.editor.hotkeys.save'), hotkey: 'Cmd + S' },
    ];

    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    /** Persists the working set. Returns `true` only when the update
     *  actually succeeded (Swift reports validation failures as a resolved
     *  `OptionalError` with `hasError == true`, never a rejected promise).
     */
    const saveChanges = async (): Promise<boolean> => {
        setIsSaving(true);
        try {
            const userRules = new UserRules({ enabled: editorStore.enabled, rules: editorStore.rules });
            const result = await window.API.Execute(new UpdateUserRulesRequest(userRules));
            setIsSaving(false);
            if (result.hasError) {
                return false;
            }
            editorStore.setIsDirty(false);

            window.API.Execute(new RecordEventRequest({
                customEvent: new CustomTelemetryEvent({
                    name: UserRulesEvents.RuleCreatedClick,
                    refName: UserRulesPages.RuleEditorScreen,
                }),
            }));
            return true;
        } catch {
            setIsSaving(false);
            return false;
        }
    };

    /** Save changes and close window. */
    const saveChangesAndCloseWindow = async () => {
        const saved = await saveChanges();
        if (!saved) {
            return;
        }
        window.API.Execute(new CloseUserRulesWindowRequest());
        setShowUnsavedChangesModal(false);
    };

    /** Discard changes and close window. */
    const discardChangesAndCloseWindow = () => {
        window.API.Execute(new CloseUserRulesWindowRequest());
        setShowUnsavedChangesModal(false);
    };

    /** Cancel close request. */
    const cancelClose = () => {
        setShowUnsavedChangesModal(false);
    };

    /** Load rules/language via RPC and send page-view telemetry. */
    useEffect(() => {
        const load = async () => {
            editorStore.setLoading(true);
            try {
                const [rulesResp, langResp] = await Promise.all([
                    window.API.Execute(new GetUserRulesRequest()),
                    window.API.Execute(new GetSystemLanguageRequest()),
                ]);
                editorStore.setLanguage(langResp.value);
                editorStore.loadRules(rulesResp.rules, rulesResp.enabled);
            } finally {
                editorStore.setLoading(false);
                editorStore.setIsDirty(false);
            }
        };
        void load();

        window.API.Execute(new RecordEventRequest({
            pageView: new PageView({ name: UserRulesPages.RuleEditorScreen }),
        }));
    }, []);

    /** Register close-request handler from Swift window lifecycle. */
    useEffect(() => {
        window.__closeRequested = () => {
            if (editorStore.isDirty) {
                setShowUnsavedChangesModal(true);
            } else {
                window.API.Execute(new CloseUserRulesWindowRequest());
            }
        };
        return () => {
            delete window.__closeRequested;
        };
    }, []);

    const saveDisabled = !editorStore.isDirty || editorStore.loading || isSaving;

    return (
        <div key={editorStore.language} className={s.App}>
            {showUnsavedChangesModal && (
                <UnsavedChangesModal
                    onCloseModal={cancelClose}
                    onDiscardChanges={discardChangesAndCloseWindow}
                    onSaveChanges={saveChangesAndCloseWindow}
                />
            )}
            <div className={s.App_header}>
                <p className={s.App_header_title}>{translate('user.rules.rule.editor')}</p>
                <p
                    className={cx(s.App_header_subtitle, s.App__link)}
                    onClick={() => {
                        window.OpenLinkInBrowser(DNS_FILTERING_KB_URL);
                    }}
                >
                    {translate('user.rules.rule.editor.desc')}
                </p>
                <div className={cx(s.App_header_hotkeys)}>
                    <div className={cx(s.App__link, s.App_header_hotkeys_label)}>
                        {translate('user.rules.editor.hotkeys')}
                        <FaqIcon />
                    </div>
                    <div className={s.App_header_hotkeys_popup}>
                        <p className={s.App_header_hotkeys_popup_title}>{translate('user.rules.editor.hotkeys')}</p>
                        {hotkeys.map(({ label, hotkey }) => (
                            <p key={hotkey} className={s.App_header_hotkeys_popup_item}>
                                {label}
                                {' '}
                                <span className={s.App_header_hotkeys_popup_item_hotkey}>{hotkey}</span>
                            </p>
                        ))}
                    </div>
                </div>
                <div className={s.App_ContextMenu}>
                    <FlagIcon onClick={() => { void window.API.Execute(new reportAnIssueRequest()); }} />
                    <div className={s.App_ContextMenu_context}>
                        <div className={s.App_ContextMenu_action}>
                            {translate('context.menu.report.problem')}
                        </div>
                    </div>
                </div>
            </div>
            <Editor className={s.App_editor} onSave={saveChanges} />
            <div className={s.App_row}>
                <button
                    className={cx(s.App_row_btn, isSaving && s.App_row_btn__loading)}
                    disabled={saveDisabled}
                    type="button"
                    onClick={saveChanges}
                >
                    <div className={s.App_row_btn_text}>{editorStore.isDirty ? translate('save') : translate('saved')}</div>
                    {isSaving && <Loader className={s.App_row_btn_loader} color="white" />}
                </button>
            </div>
        </div>
    );
}

export const App = observer(AppComponent);
