// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { history, redo, undo } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';

import {
    breakpointState,
    enabledRuleLines,
    replaceBreakpoints,
    toggleBreakpoint,
} from '../../modules/userrules/lib/breakpoints';
import { copyRuleLines, deleteRuleLines, moveRuleLines } from '../../modules/userrules/lib/lineCommands';

import type { Transaction, TransactionSpec } from '@codemirror/state';
import type { Command, EditorView } from '@codemirror/view';

const DOC = '||a.com^\n||b.com^\n||c.com^';

/**
 * Creates an editor state with the caret on the given line and the given
 * rule lines enabled.
 *
 * @param doc The editor content.
 * @param enabledLines 1-based numbers of the enabled rule lines.
 * @param cursorLine 1-based number of the line the caret sits on.
 * @returns The editor state.
 */
function rulesState(doc: string, enabledLines: number[] = [], cursorLine = 1): EditorState {
    const base = EditorState.create({ doc, extensions: [breakpointState(), history()] });
    return base.update({
        selection: { anchor: base.doc.line(cursorLine).from },
        effects: replaceBreakpoints.of(enabledLines),
    }).state;
}

/**
 * Applies a line command's transaction spec to a state.
 *
 * @param state The editor state.
 * @param spec The transaction spec under test.
 * @returns The resulting state.
 */
function apply(state: EditorState, spec: TransactionSpec | null): EditorState {
    assert.ok(spec, 'the line command must produce a transaction');
    return state.update(spec).state;
}

/**
 * Runs a CodeMirror command against a headless state. The commands used here
 * only read `state` and call `dispatch`, so a minimal target stands in for
 * the editor view.
 *
 * @param state The editor state.
 * @param command The command to run.
 * @returns The state the command produced.
 */
function runCommand(state: EditorState, command: Command): EditorState {
    let result = state;
    const target = {
        state,
        dispatch: (tr: Transaction) => {
            result = tr.state;
        },
    } as unknown as EditorView;
    command(target);
    return result;
}

test('moveRuleLines moves the rule and its marker down', () => {
    const state = rulesState(DOC, [1]);
    const moved = apply(state, moveRuleLines(state, true));

    assert.equal(moved.doc.toString(), '||b.com^\n||a.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(moved), [2]);
});

test('moveRuleLines swaps the markers of the moved line and its neighbor', () => {
    const state = rulesState(DOC, [1, 2]);
    const moved = apply(state, moveRuleLines(state, true));

    // `||a.com^` (enabled) is now line 2, `||b.com^` (enabled) is line 1.
    assert.equal(moved.doc.toString(), '||b.com^\n||a.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(moved), [1, 2]);
});

test('moveRuleLines carries the marker of the line moving up', () => {
    const state = rulesState(DOC, [2], 1);
    const moved = apply(state, moveRuleLines(state, true));

    assert.equal(moved.doc.toString(), '||b.com^\n||a.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(moved), [1]);
});

test('moveRuleLines moves the rule and its marker up', () => {
    const state = rulesState(DOC, [2], 2);
    const moved = apply(state, moveRuleLines(state, false));

    assert.equal(moved.doc.toString(), '||b.com^\n||a.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(moved), [1]);
});

test('moveRuleLines reports nothing to do at the document edges', () => {
    const first = rulesState(DOC, [1], 1);
    const last = rulesState(DOC, [3], 3);

    assert.equal(moveRuleLines(first, false), null);
    assert.equal(moveRuleLines(last, true), null);
});

test('moveRuleLines swaps a multi-line block with its neighbor', () => {
    const state = rulesState(DOC, [1, 3], 1);
    const selected = state.update({
        selection: { anchor: 0, head: state.doc.line(2).to },
    }).state;
    const moved = apply(selected, moveRuleLines(selected, true));

    assert.equal(moved.doc.toString(), '||c.com^\n||a.com^\n||b.com^');
    assert.deepEqual(enabledRuleLines(moved), [1, 2]);
});

test('copyRuleLines duplicates a multi-line block with its markers', () => {
    const state = rulesState(DOC, [1, 3], 1);
    const selected = state.update({
        selection: { anchor: 0, head: state.doc.line(2).to },
    }).state;
    const copied = apply(selected, copyRuleLines(selected, true));

    assert.equal(copied.doc.toString(), '||a.com^\n||b.com^\n||a.com^\n||b.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(copied), [1, 3, 5]);
});

test('copyRuleLines enables the copy together with the source rule', () => {
    const state = rulesState(DOC, [1]);
    const copied = apply(state, copyRuleLines(state, true));

    assert.equal(copied.doc.toString(), '||a.com^\n||a.com^\n||b.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(copied), [1, 2]);
});

test('copyRuleLines copies a disabled rule without enabling it', () => {
    const state = rulesState(DOC, [3], 2);
    const copied = apply(state, copyRuleLines(state, true));

    assert.equal(copied.doc.toString(), '||a.com^\n||b.com^\n||b.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(copied), [4]);
});

test('copyRuleLines up keeps the source rule in place', () => {
    const state = rulesState(DOC, [2], 2);
    const copied = apply(state, copyRuleLines(state, false));

    assert.equal(copied.doc.toString(), '||a.com^\n||b.com^\n||b.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(copied), [2, 3]);
});

test('copyRuleLines up inserts the copy above the caret rule', () => {
    const state = rulesState(DOC, [3], 3);
    const atLineEnd = state.update({ selection: { anchor: state.doc.line(3).to } }).state;
    const copied = apply(atLineEnd, copyRuleLines(atLineEnd, false));

    assert.equal(copied.doc.toString(), '||a.com^\n||b.com^\n||c.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(copied), [3, 4]);
    // The caret follows the rule it was on, which the copy pushed down.
    assert.equal(copied.selection.main.head, copied.doc.line(4).to);
});

test('copyRuleLines down inserts the copy below the caret rule', () => {
    const state = rulesState(DOC, [3], 3);
    const atLineEnd = state.update({ selection: { anchor: state.doc.line(3).to } }).state;
    const copied = apply(atLineEnd, copyRuleLines(atLineEnd, true));

    assert.equal(copied.doc.toString(), '||a.com^\n||b.com^\n||c.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(copied), [3, 4]);
    // The rule the caret is on stays in place, with the copy below it.
    assert.equal(copied.selection.main.head, copied.doc.line(3).to);
});

test('copyRuleLines up keeps every copy enabled when repeated', () => {
    let state = rulesState(DOC, [3], 3);
    state = state.update({ selection: { anchor: state.doc.line(3).to } }).state;

    for (let press = 0; press < 3; press += 1) {
        state = apply(state, copyRuleLines(state, false));
    }

    assert.equal(
        state.doc.toString(),
        '||a.com^\n||b.com^\n||c.com^\n||c.com^\n||c.com^\n||c.com^',
    );
    assert.deepEqual(enabledRuleLines(state), [3, 4, 5, 6]);
});

test('copyRuleLines down keeps every copy enabled when repeated', () => {
    let state = rulesState(DOC, [3], 3);
    state = state.update({ selection: { anchor: state.doc.line(3).to } }).state;

    for (let press = 0; press < 3; press += 1) {
        state = apply(state, copyRuleLines(state, true));
    }

    assert.equal(
        state.doc.toString(),
        '||a.com^\n||b.com^\n||c.com^\n||c.com^\n||c.com^\n||c.com^',
    );
    assert.deepEqual(enabledRuleLines(state), [3, 4, 5, 6]);
});

test('copyRuleLines up duplicates a multi-line block above it', () => {
    const state = rulesState(DOC, [1, 2], 1);
    const selected = state.update({
        selection: { anchor: 0, head: state.doc.line(2).to },
    }).state;
    const copied = apply(selected, copyRuleLines(selected, false));

    assert.equal(copied.doc.toString(), '||a.com^\n||b.com^\n||a.com^\n||b.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(copied), [1, 2, 3, 4]);
});

test('deleteRuleLines drops the markers of the deleted lines', () => {
    const state = rulesState(DOC, [2, 3], 2);
    const deleted = apply(state, deleteRuleLines(state));

    assert.equal(deleted.doc.toString(), '||a.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(deleted), [2]);
    assert.equal(deleted.selection.main.head, deleted.doc.line(2).from);
});

test('deleteRuleLines keeps the marker of the rule that takes the place', () => {
    const state = rulesState(DOC, [1, 3], 1);
    const deleted = apply(state, deleteRuleLines(state));

    assert.equal(deleted.doc.toString(), '||b.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(deleted), [2]);
});

test('deleteRuleLines reports nothing to do on an empty document', () => {
    assert.equal(deleteRuleLines(rulesState('')), null);
});

test('undo and redo restore the markers of a moved rule', () => {
    const state = rulesState(DOC, [1]);
    const moved = apply(state, moveRuleLines(state, true));
    assert.deepEqual(enabledRuleLines(moved), [2]);

    const undone = runCommand(moved, undo);
    assert.equal(undone.doc.toString(), DOC);
    assert.deepEqual(enabledRuleLines(undone), [1]);

    const redone = runCommand(undone, redo);
    assert.equal(redone.doc.toString(), '||b.com^\n||a.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(redone), [2]);
});

test('undo of a move keeps toggles made after it', () => {
    const state = rulesState(DOC, [1]);
    const moved = apply(state, moveRuleLines(state, true));
    // Enable `||c.com^`, which the move did not touch.
    const toggled = moved.update({ effects: [toggleBreakpoint.of(moved.doc.line(3).from)] }).state;
    assert.deepEqual(enabledRuleLines(toggled), [2, 3]);

    const undone = runCommand(toggled, undo);
    assert.equal(undone.doc.toString(), DOC);
    // The moved marker is back on line 1 and the later toggle survives.
    assert.deepEqual(enabledRuleLines(undone), [1, 3]);
});

test('undo of a move keeps a marker switched off after it', () => {
    const state = rulesState(DOC, [1, 2]);
    const moved = apply(state, moveRuleLines(state, true));
    assert.deepEqual(enabledRuleLines(moved), [1, 2]);
    // Disable `||b.com^`, which the move brought to line 1.
    const toggled = moved.update({ effects: [toggleBreakpoint.of(moved.doc.line(1).from)] }).state;
    assert.deepEqual(enabledRuleLines(toggled), [2]);

    const undone = runCommand(toggled, undo);
    assert.equal(undone.doc.toString(), DOC);
    // `||a.com^` keeps its marker, `||b.com^` stays switched off.
    assert.deepEqual(enabledRuleLines(undone), [1]);
});

test('undo of a multi-line move keeps toggles made after it', () => {
    const state = rulesState(DOC, [2], 1);
    const selected = state.update({
        selection: { anchor: 0, head: state.doc.line(2).to },
    }).state;
    const moved = apply(selected, moveRuleLines(selected, true));
    assert.equal(moved.doc.toString(), '||c.com^\n||a.com^\n||b.com^');
    assert.deepEqual(enabledRuleLines(moved), [3]);
    // Enable `||c.com^`, which moved to the top.
    const toggled = moved.update({ effects: [toggleBreakpoint.of(moved.doc.line(1).from)] }).state;
    assert.deepEqual(enabledRuleLines(toggled), [1, 3]);

    const undone = runCommand(toggled, undo);
    assert.equal(undone.doc.toString(), DOC);
    // `||b.com^` is back on line 2 and the later toggle survives.
    assert.deepEqual(enabledRuleLines(undone), [2, 3]);
});

test('undo of a copy keeps toggles made after it', () => {
    const state = rulesState(DOC, [1]);
    const copied = apply(state, copyRuleLines(state, true));
    assert.deepEqual(enabledRuleLines(copied), [1, 2]);
    // Enable `||c.com^`, which the copy pushed down.
    const toggled = copied.update({ effects: [toggleBreakpoint.of(copied.doc.line(4).from)] }).state;
    assert.deepEqual(enabledRuleLines(toggled), [1, 2, 4]);

    const undone = runCommand(toggled, undo);
    assert.equal(undone.doc.toString(), DOC);
    // The copy and its marker are gone, the later toggle survives.
    assert.deepEqual(enabledRuleLines(undone), [1, 3]);
});

test('undo of a delete keeps toggles made after it', () => {
    const state = rulesState(DOC, [1, 2], 2);
    const deleted = apply(state, deleteRuleLines(state));
    assert.equal(deleted.doc.toString(), '||a.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(deleted), [1]);
    // Enable `||c.com^`, which took the place of the deleted rule.
    const toggled = deleted.update({ effects: [toggleBreakpoint.of(deleted.doc.line(2).from)] }).state;
    assert.deepEqual(enabledRuleLines(toggled), [1, 2]);

    const undone = runCommand(toggled, undo);
    assert.equal(undone.doc.toString(), DOC);
    // `||b.com^` is restored and the later toggle survives.
    assert.deepEqual(enabledRuleLines(undone), [1, 2, 3]);
});

test('undo removes the copied rule together with its marker', () => {
    const state = rulesState(DOC, [3], 3);
    const copied = apply(state, copyRuleLines(state, false));
    assert.deepEqual(enabledRuleLines(copied), [3, 4]);

    const undone = runCommand(copied, undo);
    assert.equal(undone.doc.toString(), DOC);
    assert.deepEqual(enabledRuleLines(undone), [3]);
});

test('undo restores the markers of a deleted rule', () => {
    const state = rulesState(DOC, [1, 3], 1);
    const deleted = apply(state, deleteRuleLines(state));
    assert.deepEqual(enabledRuleLines(deleted), [2]);

    const undone = runCommand(deleted, undo);
    assert.equal(undone.doc.toString(), DOC);
    assert.deepEqual(enabledRuleLines(undone), [1, 3]);
});

test('undo restores the markers of a whole rule set that was removed', () => {
    const state = rulesState(DOC, [1, 3]);
    const cleared = state.update({ changes: { from: 0, to: state.doc.length, insert: '' } }).state;
    assert.equal(cleared.doc.toString(), '');

    const undone = runCommand(cleared, undo);
    assert.equal(undone.doc.toString(), DOC);
    assert.deepEqual(enabledRuleLines(undone), [1, 3]);
});

test('undo of deleting one of two identical rules keeps both markers', () => {
    const doc = '||a.com^\n||a.com^\n||x.com^';
    const state = rulesState(doc, [1, 2], 1);
    const deleted = apply(state, deleteRuleLines(state));
    assert.equal(deleted.doc.toString(), '||a.com^\n||x.com^');

    const undone = runCommand(deleted, undo);
    assert.equal(undone.doc.toString(), doc);
    // Both identical rules stay enabled: the deleted one is restored and
    // the surviving one keeps its own marker.
    assert.deepEqual(enabledRuleLines(undone), [1, 2]);
});

test('undo after repeated Cmd-D restores every marker', () => {
    const doc = '||a.com^\n||b.com^\n||c.com^\n||d.com^\n||e.com^';
    let state = rulesState(doc, [2, 3, 4], 2);
    for (let press = 0; press < 3; press += 1) {
        state = apply(state, deleteRuleLines(state));
    }
    assert.equal(state.doc.toString(), '||a.com^\n||e.com^');
    assert.deepEqual(enabledRuleLines(state), []);

    // Rapid deletes are separate undo steps, each restoring its own rule.
    let undone = runCommand(state, undo);
    for (let step = 1; step < 3 && undone.doc.toString() !== doc; step += 1) {
        undone = runCommand(undone, undo);
    }

    assert.equal(undone.doc.toString(), doc);
    assert.deepEqual(enabledRuleLines(undone), [2, 3, 4]);

    // Redo re-applies the deletes one by one.
    const redone = runCommand(undone, redo);
    assert.equal(redone.doc.toString(), '||a.com^\n||c.com^\n||d.com^\n||e.com^');
    assert.deepEqual(enabledRuleLines(redone), [2, 3]);
});

test('a delete right after a move is a separate undo step', () => {
    const state = rulesState(DOC, [1], 1);
    const moved = apply(state, moveRuleLines(state, true));
    assert.equal(moved.doc.toString(), '||b.com^\n||a.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(moved), [2]);

    const deleted = apply(moved, deleteRuleLines(moved));
    assert.equal(deleted.doc.toString(), '||b.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(deleted), []);

    // Undoing the delete brings the rule back on the line the move left it
    // on; a second undo puts it back on its original line.
    const undoneDelete = runCommand(deleted, undo);
    assert.equal(undoneDelete.doc.toString(), '||b.com^\n||a.com^\n||c.com^');
    assert.deepEqual(enabledRuleLines(undoneDelete), [2]);

    const undoneMove = runCommand(undoneDelete, undo);
    assert.equal(undoneMove.doc.toString(), DOC);
    assert.deepEqual(enabledRuleLines(undoneMove), [1]);
});
