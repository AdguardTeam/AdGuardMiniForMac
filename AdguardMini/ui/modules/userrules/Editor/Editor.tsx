// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { initEditor } from '@adguard/rules-editor';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'preact/hooks';
import wasmUrl from 'vscode-oniguruma/release/onig.wasm';

import { UserRule } from 'Common/apis/types';

import { editorStore } from '../editorStore';
import { breakpointState, getRulesFromEditor, setEditorValue } from '../lib/breakpoints';
import { dataUrlToBytes } from '../lib/dataUrlToBytes';
import { debouncedEditorSync } from '../lib/debouncedEditorSync';
import { editorExtensions, keepHideShortcut } from '../lib/editorExtensions';

import './Editor.cm6.pcss';
import s from './Editor.module.pcss';
import './Editor.pcss';

type EditorProps = {
    className: string;
    onSave(): void;
};

const MARKER_COLOR = 'var(--accent-main-default)';
const MARKER_HTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.9888 3.24536C14.4056 3.60773 14.4497 4.23936 14.0873 4.65614L7.13182 12.6561C6.94683 12.8689 6.68062 12.9937 6.39875 12.9998C6.11688 13.0059 5.84553 12.8927 5.65154 12.6881L1.94039 8.77448C1.56037 8.37373 1.57718 7.74079 1.97793 7.36077C2.37868 6.98075 3.01163 6.99756 3.39165 7.39831L6.34505 10.5128L12.578 3.34389C12.9404 2.92711 13.572 2.88299 13.9888 3.24536Z" fill="var(--accent-main-default)"/></svg>';

/**
 * Token colors for the TextMate grammar highlight, matching the legacy
 * `.cm-keyword` / `.cm-string` / `.cm-operator` / `.cm-comment` CSS rules.
 *
 * Classes (not just colors) are declared so the token colors live in the
 * static `Editor.cm6.pcss` stylesheet: CodeMirror's style-mod injects
 * `<style>` elements dynamically, which this module's strict CSP blocks, so
 * the CSS must ship in a regular stylesheet to be applied.
 */
const highlightStyle = HighlightStyle.define([
    { tag: tags.keyword, class: 'adg-cm-keyword', color: 'var(--additional-violet-default)' },
    { tag: tags.string, class: 'adg-cm-string', color: 'var(--error-main-default)' },
    { tag: tags.regexp, class: 'adg-cm-regexp', color: 'var(--error-main-default)' },
    { tag: tags.operator, class: 'adg-cm-operator', color: 'var(--additional-blue-default)' },
    { tag: tags.definition(tags.variableName), class: 'adg-cm-definition', color: 'var(--additional-blue-default)' },
    { tag: tags.comment, class: 'adg-cm-comment', color: 'var(--neutral-dark-default)' },
]);

/**
 * Compartment toggling read-only state while rules are (re)loaded over RPC.
 */
const readOnlyCompartment = new Compartment();

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

    const editorRef = useRef<EditorView | null>(null);

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
     * working set). `getRulesFromEditor` always returns the per-line
     * `{ enabled, rule }` pairs, so the store always mirrors the document.
     */
    const syncRulesFromEditor = () => {
        if (!editorRef.current) {
            return;
        }
        const rules = getRulesFromEditor(editorRef.current);
        setRules(rules.map((r) => new UserRule({ rule: r.rule, enabled: r.enabled })));
    };

    /**
     * Marks the editor dirty and refreshes the working set after a marker
     * toggle. A marker toggle changes no text, so the library's `onChange`
     * (which fires only for document changes) never sees it.
     */
    const onMarkerToggle = () => {
        setIsDirty(true);
        syncRulesFromEditor();
    };

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            // `wasmUrl` is inlined as a `data:` URL by webpack `asset/inline`;
            // vscode-oniguruma's `loadWASM` fetches string arguments, which the
            // module's strict CSP (`connect-src 'none'`) blocks. Hand it the
            // raw bytes instead so the editor loads without any network
            // connection.
            let wasmBytes: ArrayBuffer;
            try {
                wasmBytes = dataUrlToBytes(wasmUrl);
            } catch (err) {
                // A malformed/missing data URL must not leave an unhandled
                // promise rejection; the fallback textarea remains usable.
                // eslint-disable-next-line no-console
                console.error('[userrules] failed to decode editor wasm:', err);
                return;
            }
            let initError: unknown = null;
            try {
                editorRef.current = await initEditor(document.getElementById('area') as HTMLTextAreaElement, wasmBytes, {
                    highlight: 'full',
                    // The enabled-rule gutter and the `Mod-/` toggle are
                    // implemented locally (`lib/breakpoints`): the library's
                    // gutter has no click handling and its `Mod-/` both
                    // toggles the marker and comments the line. Keep the
                    // library's own field disabled so the two states cannot
                    // diverge.
                    withBreakpoints: false,
                    hotkeys: {
                        mode: 'mac',
                        onSave: () => {
                            if (editorStore.isDirty && !editorStore.loading) {
                                onSave();
                            }
                        },
                    },
                    onChange(view) {
                        setIsDirty(true);
                        if (view.state.doc.length === 0) {
                            setRules([]);
                            return;
                        }
                        // Re-parse the editor content into the working set. Parsing
                        // walks every line, so it is debounced and flushed before Save —
                        // running it per keystroke blocks the main thread for large
                        // rule sets.
                        debouncedEditorSync.schedule(syncRulesFromEditor);
                    },
                    extensions: [
                        breakpointState({ onToggle: onMarkerToggle }),
                        // The keymaps, localized phrases and line commands
                        // restoring the v1 behaviors the rules-editor v2
                        // dropped (`lib/editorExtensions`).
                        ...editorExtensions({ onToggle: onMarkerToggle }),
                        syntaxHighlighting(highlightStyle),
                        readOnlyCompartment.of([]),
                    ],
                });
            } catch (err) {
                // The library surfaces WASM and grammar failures as
                // `WasmLoadError` / `GrammarNotFoundError` from `initEditor`;
                // record the error so it is logged below and the fallback
                // textarea stays usable.
                initError = err;
            }
            if (initError !== null) {
                // The fallback textarea remains usable.
                // eslint-disable-next-line no-console
                console.error('[userrules] failed to init the editor:', initError);
                return;
            }
            if (!editorRef.current) {
                return;
            }
            if (cancelled) {
                // The component unmounted while the WASM grammar was loading;
                // destroy the view the library already created.
                editorRef.current.destroy();
                editorRef.current = null;
                return;
            }

            // The library's `Mod-h` binding would shadow the app's Hide menu
            // item; the guard stops the key before CodeMirror's keymap sees
            // it (see `keepHideShortcut`).
            editorRef.current.dom.addEventListener('keydown', keepHideShortcut, true);

            // Seed the editor with the loaded rules (the RPC load resolves
            // before the component mounts). Seeding dispatches a document
            // change, so the library's `onChange` schedules a parse of the set
            // just seeded; drop it — the store already holds that set.
            syncEditorFromStore();
            debouncedEditorSync.cancel();
            setIsDirty(false);
        };
        void init();
        return () => {
            cancelled = true;
            debouncedEditorSync.cancel();
            if (editorRef.current) {
                editorRef.current.dom.removeEventListener('keydown', keepHideShortcut, true);
                editorRef.current.destroy();
            }
            editorRef.current = null;
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
        // Seeding dispatches a document change, so the library's `onChange`
        // schedules a parse of the set just seeded; drop it — the store
        // already holds that set. This also clears a parse left over from a
        // prior `change` event, which is stale once the editor is re-seeded.
        debouncedEditorSync.cancel();
        setIsDirty(false);
        // Applying Assistant updates re-seeds through this effect; the
        // "applying" hint must stay up until CodeMirror has been rebuilt.
        editorStore.finishApplyingUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorStore.loadedRules]);

    /**
     * Freezes the editor while rules are (re)loaded over RPC so a concurrent
     * keystroke cannot race the re-seed.
     */
    useEffect(() => {
        if (!editorRef.current) {
            return;
        }
        editorRef.current.dispatch({
            effects: readOnlyCompartment.reconfigure(
                editorStore.loading
                    ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
                    : [],
            ),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorStore.loading]);

    return (
        <div className={cx(className, editorStore.loading && s.Editor__loading)}>
            {/* The rules-editor's CodeMirror mount and fallback textarea; the
                editor library owns the internal accessibility contract, so no
                separate label is attached here. */}
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <textarea className={s.Editor__fallback} id="area" />
        </div>
    );
}

export const Editor = observer(EditorComponent);
