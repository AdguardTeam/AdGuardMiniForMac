// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { breakpointState, enabledRuleLines, replaceBreakpoints } from '../../modules/userrules/lib/breakpoints';
import {
    editorExtensions,
    insertEnterLine,
    keepHideShortcut,
    searchPhrases,
    toggleMarkerLine,
} from '../../modules/userrules/lib/editorExtensions';

/**
 * Mounts an editor with the user-rules keymaps.
 *
 * @param doc The editor content.
 * @param onToggle Marker toggle callback.
 * @returns The mounted editor view.
 */
function mountEditor(doc: string, onToggle: () => void = () => {}): EditorView {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    return new EditorView({
        state: EditorState.create({
            doc,
            extensions: [breakpointState({ onToggle }), ...editorExtensions({ onToggle })],
        }),
        parent,
    });
}

/**
 * Dispatches a keydown event the way a browser would deliver it.
 *
 * @param view The editor view.
 * @param init The key event init.
 * @returns The dispatched event.
 */
function pressKey(view: EditorView, init: KeyboardEventInit): KeyboardEvent {
    const event = new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    view.contentDOM.dispatchEvent(event);
    return event;
}

test('insertEnterLine enables the rule typed into the created line', () => {
    const view = mountEditor('||a.com^');
    view.dispatch({ selection: { anchor: view.state.doc.length } });

    assert.equal(insertEnterLine(view), true);
    assert.equal(view.state.doc.toString(), '||a.com^\n');

    view.dispatch({ changes: { from: view.state.doc.length, insert: '||b.com^' }, userEvent: 'input.type' });
    assert.deepEqual(enabledRuleLines(view.state), [2]);

    view.destroy();
});

test('insertEnterLine at the start of an enabled rule keeps it enabled', () => {
    const view = mountEditor('||a.com^');
    toggleMarkerLine(view);
    view.dispatch({ selection: { anchor: 0 } });

    assert.equal(insertEnterLine(view), true);
    assert.equal(view.state.doc.toString(), '\n||a.com^');
    // The created empty line is pending, not the rule the caret moved onto.
    assert.deepEqual(enabledRuleLines(view.state), [2]);

    view.destroy();
});

test('toggleMarkerLine toggles the caret line and consumes comment lines', () => {
    let toggles = 0;
    const view = mountEditor('||a.com^\n! note', () => {
        toggles += 1;
    });
    view.dispatch({ selection: { anchor: 3 } });

    assert.equal(toggleMarkerLine(view, () => {
        toggles += 1;
    }), true);
    assert.equal(toggles, 1);
    assert.deepEqual(enabledRuleLines(view.state), [1]);

    view.dispatch({ selection: { anchor: view.state.doc.line(2).from } });
    assert.equal(toggleMarkerLine(view, () => {
        toggles += 1;
    }), true);
    assert.equal(toggles, 1);
    assert.deepEqual(enabledRuleLines(view.state), [1]);

    view.destroy();
});

test('Mod-/ toggles the marker through the editor keymap', () => {
    let toggles = 0;
    const view = mountEditor('||a.com^', () => {
        toggles += 1;
    });
    view.dispatch({ selection: { anchor: 0 } });

    pressKey(view, { key: '/', metaKey: true });

    assert.equal(toggles, 1);
    assert.deepEqual(enabledRuleLines(view.state), [1]);

    view.destroy();
});

test('Enter auto-enables through the editor keymap', () => {
    const view = mountEditor('||a.com^');
    view.dispatch({ selection: { anchor: view.state.doc.length } });

    pressKey(view, { key: 'Enter' });
    assert.equal(view.state.doc.toString(), '||a.com^\n');

    view.dispatch({ changes: { from: view.state.doc.length, insert: '||b.com^' }, userEvent: 'input.type' });
    assert.deepEqual(enabledRuleLines(view.state), [2]);

    view.destroy();
});

test('the line-command keymap carries the marker with the moved rule', () => {
    const view = mountEditor('||a.com^\n||b.com^');
    view.dispatch({ selection: { anchor: 0 }, effects: replaceBreakpoints.of([1]) });

    pressKey(view, { key: 'ArrowDown', altKey: true });

    assert.equal(view.state.doc.toString(), '||b.com^\n||a.com^');
    assert.deepEqual(enabledRuleLines(view.state), [2]);

    view.destroy();
});

test('Mod-r opens the search panel through the editor keymap', () => {
    const view = mountEditor('||a.com^');

    pressKey(view, { key: 'r', metaKey: true });

    assert.ok(view.dom.querySelector('.cm-panel.cm-search'), 'the search panel must open');

    view.destroy();
});

test('the search panel and dialog phrases are localized', () => {
    const view = mountEditor('');

    // `translate` resolves to the key in tests, so an untranslated phrase
    // would come back as its English original.
    assert.equal(view.state.phrase('Find'), 'user.rules.editor.search.find');
    assert.equal(view.state.phrase('current match'), 'user.rules.editor.search.current_match');
    assert.equal(view.state.phrase('on line'), 'user.rules.editor.search.on_line');
    assert.equal(view.state.phrase('Go to line'), 'user.rules.editor.search.go_to_line');
    assert.equal(view.state.phrase('go'), 'user.rules.editor.search.go');

    view.destroy();
});

test('Mod-Alt-g opens the localized go-to-line dialog', () => {
    const view = mountEditor('||a.com^');

    pressKey(view, { key: 'g', metaKey: true, altKey: true });

    const dialog = view.dom.querySelector('.cm-dialog');
    assert.ok(dialog, 'the go-to-line dialog must open');
    assert.ok(
        dialog.textContent?.includes('user.rules.editor.search.go_to_line'),
        'the dialog label must be localized',
    );
    assert.ok(
        dialog.querySelector('.cm-button')?.textContent?.includes('user.rules.editor.search.go'),
        'the submit button must be localized',
    );

    view.destroy();
});

test('searchPhrases covers every phrase CodeMirror looks up', () => {
    // The English keys `@codemirror/search` (panel labels, replace
    // announcements, go-to-line dialog) and `@codemirror/view` (dialog close)
    // resolve their UI strings by.
    const expected = [
        'Find', 'Replace', 'next', 'previous', 'all', 'match case', 'regexp',
        'by word', 'replace', 'replace all', 'close', 'replaced $ matches',
        'replaced match on line $', 'current match', 'on line', 'Go to line', 'go',
    ];

    assert.deepEqual(Object.keys(searchPhrases()).sort(), [...expected].sort());
});

test('the Cmd-H guard stops the key before the app menu sees it', () => {
    const view = mountEditor('||a.com^');
    view.dom.addEventListener('keydown', keepHideShortcut, true);
    let reachedDocument = false;
    const listener = () => {
        reachedDocument = true;
    };
    document.addEventListener('keydown', listener);

    const hide = pressKey(view, { key: 'h', metaKey: true });
    assert.equal(reachedDocument, false);
    // WebKit must still hand the unhandled shortcut to the app menu.
    assert.equal(hide.defaultPrevented, false);

    // Any other key is left alone.
    pressKey(view, { key: 'h' });
    assert.equal(reachedDocument, true);

    document.removeEventListener('keydown', listener);
    view.destroy();
});
