// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { history, undo } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { breakpointState, enabledRuleLines, setEditorValue } from '../../modules/userrules/lib/breakpoints';

/** Marker options used by the seed tests (the editor's own values). */
const MARKER_OPTIONS = { color: 'red', innerHTML: '<span></span>' };

/**
 * Creates a mounted editor with the breakpoint gutter.
 *
 * @param doc The editor content.
 * @param onToggle Callback invoked after a gutter toggle.
 * @returns The mounted editor view.
 */
function mountEditor(doc: string, onToggle: () => void): EditorView {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    return new EditorView({
        state: EditorState.create({
            doc,
            extensions: [breakpointState({ onToggle })],
        }),
        parent,
    });
}

test('the default gutter marker is the checkmark', () => {
    const view = mountEditor('', () => {});

    const marker = view.dom.querySelector('.cm-breakpoint-gutter .cm-gutterElement > div');
    assert.ok(marker, 'the gutter must render the default marker');
    assert.ok(marker.querySelector('svg'), 'the default marker must be the checkmark');
    assert.notEqual(marker.textContent, '●');

    view.destroy();
});

test('the first rule typed into an empty editor is enabled', () => {
    const view = mountEditor('', () => {});
    setEditorValue(view, [], MARKER_OPTIONS);

    view.dispatch({ changes: { from: 0, insert: '||a.com^' } });

    assert.deepEqual(enabledRuleLines(view.state), [1]);

    view.destroy();
});

test('seeding the editor is not undoable', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const view = new EditorView({
        state: EditorState.create({ doc: 'old', extensions: [breakpointState(), history()] }),
        parent,
    });

    setEditorValue(view, [{ enabled: true, rule: '||a.com^' }], MARKER_OPTIONS);
    assert.equal(view.state.doc.toString(), '||a.com^');

    undo(view);
    assert.equal(view.state.doc.toString(), '||a.com^');

    view.destroy();
});

test('a gutter click toggles the marker and reports the toggle', () => {
    let toggles = 0;
    const view = mountEditor('||a.com^', () => {
        toggles += 1;
    });

    const gutterElement = view.dom.querySelector('.cm-breakpoint-gutter .cm-gutterElement');
    assert.ok(gutterElement, 'the breakpoint gutter must render an element');
    gutterElement.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, clientY: 0 }));

    assert.equal(toggles, 1);
    assert.deepEqual(enabledRuleLines(view.state), [1]);

    view.destroy();
});

test('a gutter click on a comment line is ignored', () => {
    let toggles = 0;
    const view = mountEditor('! note', () => {
        toggles += 1;
    });

    const gutterElement = view.dom.querySelector('.cm-breakpoint-gutter .cm-gutterElement');
    assert.ok(gutterElement, 'the breakpoint gutter must render an element');
    gutterElement.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, clientY: 0 }));

    assert.equal(toggles, 0);
    assert.deepEqual(enabledRuleLines(view.state), []);

    view.destroy();
});
