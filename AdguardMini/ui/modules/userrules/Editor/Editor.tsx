// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { initEditor, RulesBuilder, getRulesFromEditor, configureEditorMode, setEditorValue } from '@adguard/rules-editor';
import '@adguard/rules-editor/dist/codemirror.css';
import wasm from '@adguard/rules-editor/dist/onigasm.wasm';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'preact/hooks';

import { UserRule } from 'Common/apis/types';

import { editorStore } from '../editorStore';
import { dataUrlToBytes } from '../lib/dataUrlToBytes';

import s from './Editor.module.pcss';
import './Editor.pcss';

import type { EditorFromTextArea } from '@adguard/rules-editor';

type EditorProps = {
    className: string;
    onSave(): void;
};

const MARKER_COLOR = 'var(--stroke-icons-product-icon-default)';
const MARKER_HTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.9888 3.24536C14.4056 3.60773 14.4497 4.23936 14.0873 4.65614L7.13182 12.6561C6.94683 12.8689 6.68062 12.9937 6.39875 12.9998C6.11688 13.0059 5.84553 12.8927 5.65154 12.6881L1.94039 8.77448C1.56037 8.37373 1.57718 7.74079 1.97793 7.36077C2.37868 6.98075 3.01163 6.99756 3.39165 7.39831L6.34505 10.5128L12.578 3.34389C12.9404 2.92711 13.572 2.88299 13.9888 3.24536Z" fill="var(--stroke-icons-product-icon-default)"/></svg>';

/* The theme to style the editor with.
 * The default is "default" theme and "adg" for override default theme
 */
const THEME = 'default adg';

/**
 * User rules editor component
 */
function EditorComponent({
    className,
    onSave,
}: EditorProps) {
    const {
        setIsDirty,
        setRules,
    } = editorStore;

    const editorRef = useRef<EditorFromTextArea | null>(null);
    const isEmpty = editorStore.rules.length === 0;
    const lineChangedByEnter = useRef<number | null>(isEmpty ? 0 : null);

    /**
     * Syncs the CodeMirror editor content from `editorStore.rules`.
     * `setEditorValue` accepts `{ enabled, rule }[]`; proto `UserRule`
     * exposes exactly those fields, so no conversion is needed.
     */
    const syncEditorFromStore = () => {
        if (!editorRef.current) {
            return;
        }
        setEditorValue(editorRef.current, editorStore.rules, {
            color: MARKER_COLOR,
            innerHTML: MARKER_HTML,
        });
    };

    /**
     * Parses the current editor content into `editorStore.rules` (the
     * working set). On a parse failure the raw text is preserved for display
     * but the previous working set is kept — never wiped — so a subsequent
     * Save cannot silently erase user rules.
     */
    const syncRulesFromEditor = () => {
        if (!editorRef.current) {
            return;
        }
        const rules = getRulesFromEditor(editorRef.current);
        if (typeof rules === 'string') {
            // Parse error / raw output path: keep the previous rules.
            return;
        }
        setRules(rules.map((r) => new UserRule({ rule: r.rule, enabled: r.enabled })));
    };

    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            // `wasm` is inlined as a `data:` URL by webpack `asset/inline`;
            // onigasm's `loadWASM` fetches string arguments, which the module's
            // strict CSP (`connect-src 'none'`) blocks. Hand it the raw bytes
            // instead so the editor loads without any network connection.
            let wasmBytes: ArrayBuffer;
            try {
                wasmBytes = dataUrlToBytes(wasm);
            } catch (err) {
                // A malformed/missing data URL must not leave an unhandled
                // promise rejection; the fallback textarea remains usable.
                // eslint-disable-next-line no-console
                console.error('[userrules] failed to decode editor wasm:', err);
                return;
            }
            try {
                editorRef.current = await initEditor(document.getElementById('area') as HTMLTextAreaElement, wasmBytes, {
                    withBreakpoints: true,
                    hotkeys: {
                        mode: 'mac',
                        toggleRule: () => {
                            setIsDirty(true);
                            syncRulesFromEditor();
                        },
                        markerColor: MARKER_COLOR,
                        markerHTML: MARKER_HTML,
                        onSave: () => {
                            if (editorStore.isDirty && !editorStore.loading) {
                                onSave();
                            }
                        },
                    },
                    onChange(editor, makeMarker) {
                        setIsDirty(true);
                        if (editorRef.current?.getValue() === '') {
                            setRules([]);
                            return;
                        }
                        if (lineChangedByEnter.current !== null) {
                            const info = editor.lineInfo(lineChangedByEnter.current);
                            if (info?.text && RulesBuilder.getRuleType(info.text) !== 'comment') {
                                editor.setGutterMarker(lineChangedByEnter.current, 'breakpoints', makeMarker());
                                lineChangedByEnter.current = null;
                            }
                        }
                        configureEditorMode(editor);
                        // Persist the editor content as proto UserRule[] (working set).
                        syncRulesFromEditor();
                    },
                    editor: {
                        gutters: ['CodeMirror-linenumbers', 'breakpoints'],
                        theme: THEME,
                    },
                });
            } catch {
                return;
            }
            if (cancelled) {
                return;
            }
            // Fill the flex container (`App_editor`) exactly; the scroll area
            // handles overflow, so the editor keeps a fixed height.
            editorRef.current.setSize(null, '100%');

            editorRef.current.setOption('extraKeys', {
                ...editorRef.current.getOption('extraKeys') as Record<string, () => void>,
                Enter: (cm) => {
                    lineChangedByEnter.current = cm.getCursor().line + 1;
                    cm.execCommand('newlineAndIndent');
                },
            });

            // Seed the editor with the loaded rules (if the RPC load already resolved).
            if (editorStore.rules.length) {
                syncEditorFromStore();
                setIsDirty(false);
            }
        };
        void init();
        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Re-syncs the editor when rules are loaded externally (RPC). Depends on
     * `loadedRules` (the load signal), not `rules` (the working set), so it
     * does NOT fire on the editor's own `onChange` mutations.
     */
    useEffect(() => {
        syncEditorFromStore();
        setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorStore.loadedRules]);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setOption('readOnly', editorStore.loading ? 'nocursor' : false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorStore.loading]);

    return (
        <div className={cx(className, editorStore.loading && s.Editor__loading)}>
            <textarea className={s.Editor__fallback} id="area" />
        </div>
    );
}

export const Editor = observer(EditorComponent);
