// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '@adguard/rules-editor/dist/codemirror.css';

import type { EditorFromTextArea } from '@adguard/rules-editor';

import { initEditor, RulesBuilder, getRulesFromEditor, configureEditorMode, setEditorValue } from '@adguard/rules-editor';
import wasm from '@adguard/rules-editor/dist/onigasm.wasm';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'preact/hooks';

// Read splitter description in consts.ts for more info
import { SPLITTER } from 'Modules/common/utils/consts';

import { editorStore } from '../editorStore';

import s from './Editor.module.pcss';
import './Editor.pcss';

type EditorProps = {
    className: string;
    onSave(): void;
    fallback: boolean | undefined;
};

/**
 * Window header height in pixels
 */
const WINDOW_HEADER_HEIGHT = '86px';

/**
 * Window footer height in pixels
 */
const WINDOW_FOOTER_HEIGHT = '112px';

/**
 * Editor height calculated as full height minus header and footer heights
 */
const EDITOR_HEIGHT = `calc(100% - ${WINDOW_HEADER_HEIGHT} - ${WINDOW_FOOTER_HEIGHT})`;

let inited = false;

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
    fallback,
    onSave,
}: EditorProps) {
    const {
        setIsDirty,
        setExportValue,
    } = editorStore;

    const editorRef = useRef<EditorFromTextArea | null>(null);
    const isEmpty = editorStore.editorValue.length === 0;
    const lineChangedByEnter = useRef<number | null>(isEmpty ? 0 : null);
    const [fallbackValue, setFallbackValue] = useState<string>();

    /**
     * Processes editor data and returns rules in format:
     * "enabled_state!~!rule_text"
     * where enabled_state is 1 or 0 and rule_text is the actual rule
     * Rules are joined with newlines
     * @returns {string} Processed rules data
     */
    const processData = () => {
        const rules = getRulesFromEditor(editorRef.current!);

        if (typeof rules === 'string') {
            return rules;
        }
        // AG-51375 fix escaping for \ in rules
        return rules.map(({ enabled, rule }) => `${Number(enabled)}${SPLITTER}${rule.replace(/\\/g, '\\\\')}`).join('\n');
    };

    const parseInputDataAndSetEditorValue = () => {
        if (!editorRef.current) {
            return;
        }
        // Split editor value by lines and process each line
        const data = editorStore.editorValue.split('\n').map((line) => {
            // Split line into enabled flag and rule text
            const [enabled, rule] = line.split(SPLITTER);
            return { enabled: !!Number(enabled), rule };
        });
        // Set processed rules text in editor
        setEditorValue(editorRef.current!, data, {
            color: MARKER_COLOR,
            innerHTML: MARKER_HTML,
        });
    };

    useEffect(() => {
        const init = async () => {
            editorRef.current = await initEditor(document.getElementById('area') as HTMLTextAreaElement, wasm, {
                withBreakpoints: true,
                hotkeys: {
                    mode: 'mac',
                    toggleRule: () => {
                        setIsDirty(true);
                        setExportValue(processData());
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
                        setExportValue('');
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
                    setExportValue(processData());
                },
                editor: {
                    gutters: ['CodeMirror-linenumbers', 'breakpoints'],
                    theme: THEME,
                },
            });
            editorRef.current.setSize(null, EDITOR_HEIGHT);

            editorRef.current.setOption('extraKeys', {
                ...editorRef.current.getOption('extraKeys') as Record<string, () => void>,
                Enter: (cm) => {
                    lineChangedByEnter.current = cm.getCursor().line + 1;
                    cm.execCommand('newlineAndIndent');
                },
            });

            inited = true;

            // If there is editor value stored
            if (editorStore.editorValue) {
                parseInputDataAndSetEditorValue();
                setIsDirty(false);
            }
        };
        if (typeof fallback === 'boolean' && !fallback && !inited) {
            init();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fallback]);

    useEffect(() => {
        if (editorRef.current) {
            parseInputDataAndSetEditorValue();
        } else {
            setFallbackValue(editorStore.editorValue);
        }
        setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorStore.editorValue, fallback]);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setOption('readOnly', editorStore.loading ? 'nocursor' : false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorStore.loading]);

    return (
        <div className={cx(className, editorStore.loading && s.Editor__loading)}>
            {fallback ? (
                <textarea
                    className={s.Editor__fallback}
                    onChange={(e) => {
                        setIsDirty(true);
                        setExportValue(e.currentTarget.value);
                        setFallbackValue(e.currentTarget.value);
                    }}
                >
                    {fallbackValue}
                </textarea>
            ) : (
                <textarea className={s.Editor__fallback} id="area" />
            )}
        </div>
    );
}

export const Editor = observer(EditorComponent);
