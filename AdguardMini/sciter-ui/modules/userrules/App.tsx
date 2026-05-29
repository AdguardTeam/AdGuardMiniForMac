// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'preact/hooks';

import { RulesEditorEvents } from 'Common/utils/consts';

import s from './App.module.pcss';
import { Editor } from './Editor';
import { editorStore } from './editorStore';
import { FaqIcon } from './FaqIcon';
import { FlagIcon } from './FlagIcon';
import { Loader } from './Loader';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { UpdateInfo } from './UpdateInfo';

/**
 * User rules screen with editor
 */
function AppComponent() {
    const {
        setIsDirty,
        setEditorValue,
        setDraftValue,
        setLoading,
        setChunkLoading,
        appendEditorValue,
    } = editorStore;

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
    const [fallback, setFallback] = useState<boolean>();
    const [isSaving, setIsSaving] = useState(false);
    const [saveHasBeenCalled, setSaveHasBeenCalled] = useState(false);

    const sendWindowCloseRequest = () => {
        window.jsBridgeCall(RulesEditorEvents.close_request);
    };

    const saveChangesAndCloseWindow = () => {
        window.jsBridgeCall(RulesEditorEvents.save_changes, JSON.stringify(editorStore.exportValue));
        sendWindowCloseRequest();
    };

    const saveChanges = () => {
        setIsSaving(true);
        setSaveHasBeenCalled(true);
        window.jsBridgeCall(RulesEditorEvents.save_changes, JSON.stringify(editorStore.exportValue));
    };

    const handleWindowClose = () => {
        if (editorStore.isDirty) {
            setShowUnsavedChangesModal(true);
        } else {
            sendWindowCloseRequest();
        }
    };

    const updateRulesFromOutside = async () => {
        setLoading(true);
        requestAnimationFrame(() => {
            setEditorValue(editorStore.draftValue);
            setDraftValue('');
            setIsDirty(false);
            setLoading(false);
        });
    };

    useEffect(() => {
        if (editorStore.draftValue && !editorStore.isDirty) {
            updateRulesFromOutside();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorStore.draftValue, editorStore.isDirty]);

    /**
     * Catch changes from outside
     */
    useEffect(() => {
        window.jsBridgeCall(RulesEditorEvents.telemetry_page_view);

        (window as any).data = new Proxy({}, {
            set(target, key, value) {
                (target as any)[key] = value;

                switch (key) {
                    case RulesEditorEvents.initial:
                        setEditorValue(value);
                        break;
                    case RulesEditorEvents.initial_chunk_start:
                        setChunkLoading(true);
                        break;
                    case RulesEditorEvents.initial_chunk:
                        appendEditorValue(value);
                        break;
                    case RulesEditorEvents.initial_chunk_end:
                        setChunkLoading(false);
                        break;
                    case RulesEditorEvents.close:
                        handleWindowClose();
                        break;
                    case RulesEditorEvents.fallback_mode:
                        setFallback(value);
                        break;
                    case RulesEditorEvents.theme:
                        document.documentElement.setAttribute('theme', value);
                        break;
                    case RulesEditorEvents.user_rules_updated:
                        if (value !== editorStore.editorValue) {
                            setDraftValue(value);
                        }
                        break;
                    case RulesEditorEvents.rules_saved:
                        setIsSaving(false);
                        setIsDirty(false);

                        window.jsBridgeCall(RulesEditorEvents.telemetry_event_rules_created_click);
                        break;
                    case RulesEditorEvents.language:
                        editorStore.setLanguage(value);
                        break;
                }

                return true;
            },
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Initial request
     */
    useEffect(() => {
        window.jsBridgeCall(RulesEditorEvents.get_initial_data);
        window.jsBridgeCall(RulesEditorEvents.init_theme);
    }, []);

    const saveDisabled = !editorStore.isDirty || editorStore.loading || isSaving;

    return (
        <div key={editorStore.language} id="userrules-editor-page" className={s.App}>
            {showUnsavedChangesModal && (
                <UnsavedChangesModal
                    onCloseModal={() => setShowUnsavedChangesModal(false)}
                    onDiscardChanges={sendWindowCloseRequest}
                    onSaveChanges={saveChangesAndCloseWindow}
                />
            )}
            <div className={s.App_header}>
                <p className={s.App_header_title}>{translate('user.rules.rule.editor')}</p>
                <p
                    className={cx(s.App_header_subtitle, s.App__link)}
                    onClick={() => {
                        window.jsBridgeCall(RulesEditorEvents.open_dns_filtering_kb);
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
                    <FlagIcon onClick={() => window.jsBridgeCall(RulesEditorEvents.open_report_bug)} />
                    <div className={s.App_ContextMenu_context}>
                        <div className={s.App_ContextMenu_action}>
                            {translate('context.menu.report.problem')}
                        </div>
                    </div>
                </div>
            </div>
            {editorStore.chunkLoading && (
                <div className={s.App_loader}>
                    <Loader />
                </div>
            )}
            {!editorStore.chunkLoading && (
                <Editor className={s.App_editor} fallback={fallback} onSave={saveChanges} />
            )}
            <div className={s.App_row}>
                <button
                    id="userrules-editor-save-button"
                    className={cx(s.App_row_btn, (editorStore.chunkLoading || isSaving) && s.App_row_btn__loading)}
                    disabled={saveDisabled}
                    type="button"
                    onClick={saveChanges}
                >
                    <div className={s.App_row_btn_text}>{editorStore.isDirty ? translate('save') : translate('saved')}</div>
                    {isSaving && <Loader className={s.App_row_btn_loader} color="white" />}
                </button>
                <UpdateInfo
                    hasUpdates={Boolean(editorStore.isDirty && editorStore.draftValue && !isSaving)}
                    loading={editorStore.loading}
                    saved={saveHasBeenCalled && saveDisabled}
                    onUpdate={updateRulesFromOutside}
                />
            </div>
        </div>
    );
}

export const App = observer(AppComponent);
