// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { deleteCharBackward, history, redo, undo } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';

import {
    breakpointState,
    computeNewDoc,
    enableBreakpoints,
    enabledRuleLines,
    enterLineNumber,
    isBreakpointAt,
    isCommentLine,
    permuteBreakpoints,
    replaceBreakpoints,
    rulesFromState,
    setEnterLine,
    toggleBreakpoint,
} from '../../modules/userrules/lib/breakpoints';

import type { Transaction } from '@codemirror/state';
import type { Command, EditorView } from '@codemirror/view';

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

test('isCommentLine classifies comments', () => {
    assert.equal(isCommentLine('! my comment'), true);
    assert.equal(isCommentLine('# hosts comment'), true);
    assert.equal(isCommentLine('||example.com^'), false);
    assert.equal(isCommentLine('example.com##.ad'), false);
    assert.equal(isCommentLine('@@||example.com^$important'), false);
});

test('toggleBreakpoint toggles a line marker', () => {
    const state = EditorState.create({
        doc: '||a.com^\n||b.com^\n! note',
        extensions: [breakpointState()],
    });

    const toggled = state.update({ effects: [toggleBreakpoint.of(0)] }).state;
    assert.deepEqual(enabledRuleLines(toggled), [1]);
    assert.equal(isBreakpointAt(toggled, 0), true);

    const untoggled = toggled.update({ effects: [toggleBreakpoint.of(0)] }).state;
    assert.deepEqual(enabledRuleLines(untoggled), []);
});

test('rulesFromState reports enabled flags per line', () => {
    // Line starts: `||a.com^` at 0, `! note` at 9, `||b.com^` at 16.
    const doc = '||a.com^\n! note\n||b.com^';
    const state = EditorState.create({ doc, extensions: [breakpointState()] });

    const withMarkers = state.update({
        effects: [toggleBreakpoint.of(0), toggleBreakpoint.of(16)],
    }).state;

    assert.deepEqual(rulesFromState(withMarkers), [
        { enabled: true, rule: '||a.com^' },
        { enabled: false, rule: '! note' },
        { enabled: true, rule: '||b.com^' },
    ]);
});

test('markers survive document edits that do not touch their lines', () => {
    const state = EditorState.create({
        doc: '||a.com^\n||b.com^\n||c.com^',
        extensions: [breakpointState()],
    });
    const withMarker = state.update({ effects: [toggleBreakpoint.of(9)] }).state;

    // Insert a line above; the marker must map to the same logical line
    // (line 2 becomes line 3).
    const edited = withMarker.update({
        changes: { from: 0, insert: '! header\n' },
    }).state;

    assert.deepEqual(enabledRuleLines(edited), [3]);
    assert.deepEqual(rulesFromState(edited), [
        { enabled: false, rule: '! header' },
        { enabled: false, rule: '||a.com^' },
        { enabled: true, rule: '||b.com^' },
        { enabled: false, rule: '||c.com^' },
    ]);
});

test('computeNewDoc joins rules with newlines', () => {
    assert.equal(
        computeNewDoc([
            { enabled: true, rule: '||a.com^' },
            { enabled: false, rule: '! note' },
        ]),
        '||a.com^\n! note',
    );
    assert.equal(computeNewDoc([]), '');
});

test('replaceBreakpoints sets and clears markers by line number', () => {
    const state = EditorState.create({
        doc: '||a.com^\n! note\n||b.com^',
        extensions: [breakpointState()],
    });

    const marked = state.update({ effects: [replaceBreakpoints.of([1, 3])] }).state;
    assert.deepEqual(enabledRuleLines(marked), [1, 3]);

    const cleared = marked.update({ effects: [replaceBreakpoints.of([])] }).state;
    assert.deepEqual(enabledRuleLines(cleared), []);
});

test('a marker follows its rule when a line break is inserted above it', () => {
    // `Enter` at the start of an enabled rule creates an empty line; the
    // marker must stay with the rule, not with the new line.
    const state = EditorState.create({
        doc: '||a.com^\n||b.com^',
        extensions: [breakpointState()],
    });
    const marked = state.update({ effects: [toggleBreakpoint.of(0)] }).state;

    const split = marked.update({ changes: { from: 0, insert: '\n' } }).state;

    assert.equal(split.doc.toString(), '\n||a.com^\n||b.com^');
    assert.deepEqual(enabledRuleLines(split), [2]);
});

test('a marker follows its rule when a block is pasted before it', () => {
    const state = EditorState.create({
        doc: '||a.com^\n||b.com^',
        extensions: [breakpointState()],
    });
    const marked = state.update({ effects: [toggleBreakpoint.of(0)] }).state;

    const pasted = marked.update({ changes: { from: 0, insert: '! one\n! two\n' } }).state;

    assert.equal(pasted.doc.toString(), '! one\n! two\n||a.com^\n||b.com^');
    assert.deepEqual(enabledRuleLines(pasted), [3]);
});

test('deleting a rule line drops its marker', () => {
    const state = EditorState.create({
        doc: '||a.com^\n||b.com^',
        extensions: [breakpointState()],
    });
    const marked = state.update({ effects: [toggleBreakpoint.of(0)] }).state;

    const deleted = marked.update({
        changes: { from: 0, to: state.doc.line(1).to + 1 },
    }).state;

    assert.equal(deleted.doc.toString(), '||b.com^');
    assert.deepEqual(enabledRuleLines(deleted), []);
});

test('enableBreakpoints adds markers idempotently', () => {
    const state = EditorState.create({
        doc: '||a.com^\n||b.com^',
        extensions: [breakpointState()],
    });

    const enabled = state.update({ effects: [enableBreakpoints.of([1, 2])] }).state;
    assert.deepEqual(enabledRuleLines(enabled), [1, 2]);

    // Replaying the same effect must not toggle the already-enabled lines off.
    const again = enabled.update({ effects: [enableBreakpoints.of([1, 2])] }).state;
    assert.deepEqual(enabledRuleLines(again), [1, 2]);
});

test('chained permutations are applied in order', () => {
    const state = EditorState.create({
        doc: '||a.com^\n||b.com^\n||c.com^',
        extensions: [breakpointState()],
    });
    const marked = state.update({ effects: [toggleBreakpoint.of(0)] }).state;
    const swap = (first: number, second: number) => (lines: number[]): number[] => lines.map((line) => {
        if (line === first) {
            return second;
        }
        return line === second ? first : line;
    });

    // Two permutations in one transaction: line 1 -> 2 -> 3.
    const moved = marked.update({
        effects: [
            permuteBreakpoints.of({ map: swap(1, 2), invert: swap(1, 2) }),
            permuteBreakpoints.of({ map: swap(2, 3), invert: swap(2, 3) }),
        ],
    }).state;

    assert.deepEqual(enabledRuleLines(moved), [3]);
});

test('rulesFromState skips empty lines', () => {
    const state = EditorState.create({
        doc: '||a.com^\n\n! note\n',
        extensions: [breakpointState()],
    });

    assert.deepEqual(rulesFromState(state), [
        { enabled: false, rule: '||a.com^' },
        { enabled: false, rule: '! note' },
    ]);
});

test('a paste enables its non-comment rules', () => {
    const state = EditorState.create({
        doc: '||a.com^',
        extensions: [breakpointState()],
    });

    const pasted = state.update({
        changes: { from: 0, insert: '||x.com^\n! note\n\n||y.com^\n' },
        userEvent: 'input.paste',
    }).state;

    assert.deepEqual(enabledRuleLines(pasted), [1, 4]);
    assert.deepEqual(rulesFromState(pasted).map((r) => r.rule), [
        '||x.com^',
        '! note',
        '||y.com^',
        '||a.com^',
    ]);
});

test('a paste inside a disabled rule does not enable it', () => {
    const state = EditorState.create({
        doc: '||old.com^',
        extensions: [breakpointState()],
    });

    // Replace `old` inside the rule; the rule itself is not created by the
    // paste and keeps its disabled state (v1 semantics).
    const pasted = state.update({
        changes: { from: 2, to: 5, insert: 'new' },
        userEvent: 'input.paste',
    }).state;

    assert.equal(pasted.doc.toString(), '||new.com^');
    assert.deepEqual(enabledRuleLines(pasted), []);
});

test('a paste that replaces a whole rule line enables it', () => {
    const state = EditorState.create({
        doc: '||old.com^',
        extensions: [breakpointState()],
    });

    const pasted = state.update({
        changes: { from: 0, to: state.doc.length, insert: '||new.com^' },
        userEvent: 'input.paste',
    }).state;

    assert.deepEqual(enabledRuleLines(pasted), [1]);
});

test('undo of a paste removes the markers it added', () => {
    const state = EditorState.create({
        doc: '||a.com^',
        extensions: [breakpointState(), history()],
    });
    const pasted = state.update({
        changes: { from: 0, insert: '||x.com^\n' },
        userEvent: 'input.paste',
    }).state;
    assert.deepEqual(enabledRuleLines(pasted), [1]);

    const undone = runCommand(pasted, undo);
    assert.equal(undone.doc.toString(), '||a.com^');
    assert.deepEqual(enabledRuleLines(undone), []);
});

test('enterLineNumber returns the line the newline created', () => {
    const state = EditorState.create({ doc: '||a.com^\n||b.com^\n||c.com^' });
    // The caret follows the inserted break, as `insertNewline` leaves it.
    // Mid-line: the break splits the line and the caret sits on the tail.
    const mid = state.update({
        changes: { from: 5, insert: '\n' },
        selection: { anchor: 6 },
    }).state;
    assert.equal(enterLineNumber(mid, false), 2);
    // At a line start: the break creates the empty line above the caret.
    const atStart = state.update({
        changes: { from: state.doc.line(3).from, insert: '\n' },
        selection: { anchor: state.doc.line(3).from + 1 },
    }).state;
    assert.equal(enterLineNumber(atStart, true), 3);
    // At a line end: the caret lands on the new line below the rule.
    const atEnd = state.update({
        changes: { from: state.doc.line(1).to, insert: '\n' },
        selection: { anchor: state.doc.line(1).to + 1 },
    }).state;
    assert.equal(enterLineNumber(atEnd, false), 2);
    // At the start of an empty line: the caret's line is the created one.
    const empty = EditorState.create({ doc: '||a.com^\n\n||b.com^' });
    const atEmptyStart = empty.update({
        changes: { from: empty.doc.line(2).from, insert: '\n' },
        selection: { anchor: empty.doc.line(2).from + 1 },
    }).state;
    assert.equal(enterLineNumber(atEmptyStart, true), 3);
});

test('a line recorded by Enter is enabled once it gains content', () => {
    const state = EditorState.create({
        doc: '||a.com^',
        extensions: [breakpointState()],
    });
    // `Enter` at the end of the document: the new empty line is recorded.
    const split = state.update({ changes: { from: state.doc.length, insert: '\n' } }).state;
    const pending = split.update({ effects: [setEnterLine.of(2)] }).state;
    assert.deepEqual(enabledRuleLines(pending), []);

    const typed = pending.update({ changes: { from: pending.doc.length, insert: '||b.com^' } }).state;
    assert.deepEqual(enabledRuleLines(typed), [2]);
});

test('an Enter line that already has content is enabled immediately', () => {
    const state = EditorState.create({
        doc: '||a.com^',
        extensions: [breakpointState()],
    });
    // `Enter` in the middle of a rule: the new line carries the tail.
    const split = state.update({ changes: { from: 5, insert: '\n' } }).state;
    const pending = split.update({ effects: [setEnterLine.of(2)] }).state;

    assert.deepEqual(enabledRuleLines(pending), [2]);
});

test('Enter at the start of an enabled rule keeps it enabled', () => {
    const state = EditorState.create({
        doc: '||a.com^',
        extensions: [breakpointState()],
    });
    const marked = state.update({ effects: [toggleBreakpoint.of(0)] }).state;

    // The rule moves to line 2; the created empty line above it is pending,
    // so the rule keeps its own marker without being re-enabled by the
    // pending line.
    const split = marked.update({ changes: { from: 0, insert: '\n' } }).state;
    const pending = split.update({ effects: [setEnterLine.of(1)] }).state;

    assert.equal(pending.doc.toString(), '\n||a.com^');
    assert.deepEqual(enabledRuleLines(pending), [2]);
});

test('Enter at the start of a disabled rule does not enable it', () => {
    const state = EditorState.create({
        doc: '||a.com^',
        extensions: [breakpointState()],
    });
    // The caret follows the inserted break, as `insertNewline` leaves it.
    const split = state.update({
        changes: { from: 0, insert: '\n' },
        selection: { anchor: 1 },
    }).state;
    // The empty line the break created above the rule is the pending one.
    const pending = split.update({ effects: [setEnterLine.of(enterLineNumber(split, true))] }).state;

    assert.equal(pending.doc.toString(), '\n||a.com^');
    assert.deepEqual(enabledRuleLines(pending), []);

    // Typing at the caret prepends to the rule: the pending line above stays
    // empty, so the rule is not enabled.
    const typed = pending.update({ changes: { from: pending.selection.main.head, insert: 'x' } }).state;
    assert.deepEqual(enabledRuleLines(typed), []);
});

test('Enter in an empty editor leaves the caret line pending', () => {
    const state = EditorState.create({ doc: '', extensions: [breakpointState()] });
    const split = state.update({
        changes: { from: 0, insert: '\n' },
        selection: { anchor: 1 },
    }).state;
    const pending = split.update({ effects: [setEnterLine.of(enterLineNumber(split, true))] }).state;

    // The rule typed on the line below the break is enabled.
    const typed = pending.update({ changes: { from: pending.selection.main.head, insert: '||a.com^' } }).state;
    assert.deepEqual(enabledRuleLines(typed), [2]);
});

test('deleting the empty line above a rule drops the pending state', () => {
    const state = EditorState.create({
        doc: '||a.com^',
        extensions: [breakpointState()],
    });
    const split = state.update({ changes: { from: 0, insert: '\n' } }).state;
    const pending = split.update({ effects: [setEnterLine.of(1)] }).state;

    // Backspace at the start of the rule removes the created empty line.
    const merged = pending.update({ changes: { from: 0, to: 1 } }).state;

    assert.equal(merged.doc.toString(), '||a.com^');
    // The pending state must not survive onto the rule that moved up.
    assert.deepEqual(enabledRuleLines(merged), []);
});

test('deleting the Enter line before it gains content drops the pending state', () => {
    const state = EditorState.create({
        doc: '||a.com^\n\n||b.com^',
        extensions: [breakpointState()],
    });
    const pending = state.update({ effects: [setEnterLine.of(2)] }).state;

    // Backspace at the start of the empty line merges it away (the break
    // before the pending line is deleted).
    const merged = pending.update({ changes: { from: 8, to: 9 } }).state;
    assert.equal(merged.doc.toString(), '||a.com^\n||b.com^');

    const typed = merged.update({ changes: { from: merged.doc.length, insert: 'x' } }).state;
    assert.deepEqual(enabledRuleLines(typed), []);
});

test('undo of a text edit keeps toggles made after it', () => {
    const state = EditorState.create({
        doc: '||a.com^\n||b.com^',
        extensions: [breakpointState(), history()],
    });
    const typed = state.update({
        changes: { from: 0, insert: '!' },
        userEvent: 'input.type',
    }).state;
    const toggled = typed.update({ effects: [toggleBreakpoint.of(typed.doc.line(2).from)] }).state;
    assert.deepEqual(enabledRuleLines(toggled), [2]);

    const undone = runCommand(toggled, undo);
    assert.equal(undone.doc.toString(), '||a.com^\n||b.com^');
    // The toggle is not part of history: undoing the edit must not revert it.
    assert.deepEqual(enabledRuleLines(undone), [2]);
});

test('undo of a Backspace that merged an enabled rule into the line above', () => {
    const doc = '||a.com^\n||b.com^';
    const state = EditorState.create({
        doc,
        extensions: [breakpointState(), history()],
    }).update({
        // The caret sits at the start of the enabled second rule.
        selection: { anchor: 9 },
        effects: [replaceBreakpoints.of([2])],
    }).state;

    // Backspace joins the rule to the line above.
    const merged = runCommand(state, deleteCharBackward);
    assert.equal(merged.doc.toString(), '||a.com^||b.com^');

    const undone = runCommand(merged, undo);
    assert.equal(undone.doc.toString(), doc);
    // The marker must return to the rule it was on, not stay on the rule
    // it was merged into.
    assert.deepEqual(enabledRuleLines(undone), [2]);

    const redone = runCommand(undone, redo);
    assert.equal(redone.doc.toString(), '||a.com^||b.com^');
    assert.deepEqual(enabledRuleLines(redone), [1]);
});

test('undo of a held Backspace that merged a rule restores its marker', () => {
    const doc = '||a.com^\n||b.com^';
    let state = EditorState.create({
        doc,
        extensions: [breakpointState(), history()],
    }).update({
        selection: { anchor: 9 },
        effects: [replaceBreakpoints.of([2])],
    }).state;

    // Held Backspace: the merge and the deletions that follow it share one
    // undo step, and the merge's inversion must still land on the right line.
    for (let press = 0; press < 4; press += 1) {
        state = runCommand(state, deleteCharBackward);
    }
    assert.equal(state.doc.toString(), '||a.c||b.com^');

    const undone = runCommand(state, undo);
    assert.equal(undone.doc.toString(), doc);
    assert.deepEqual(enabledRuleLines(undone), [2]);
});

test('undo of a merge keeps the marker of the line above too', () => {
    const doc = '||a.com^\n||b.com^';
    const state = EditorState.create({
        doc,
        extensions: [breakpointState(), history()],
    }).update({
        selection: { anchor: 9 },
        effects: [replaceBreakpoints.of([1, 2])],
    }).state;

    const merged = runCommand(state, deleteCharBackward);
    assert.equal(merged.doc.toString(), '||a.com^||b.com^');
    // The two markers share the merged line.
    assert.deepEqual(enabledRuleLines(merged), [1]);

    const undone = runCommand(merged, undo);
    assert.equal(undone.doc.toString(), doc);
    // Both rules were enabled before the merge and must be again after the
    // undo; the merged line's marker must not be dropped.
    assert.deepEqual(enabledRuleLines(undone), [1, 2]);
});

test('a pending Enter line survives Backspace over its first character', () => {
    const state = EditorState.create({ doc: '||a.com^', extensions: [breakpointState()] });
    // `Enter` at the end of the rule: the new empty line is pending.
    const split = state.update({
        changes: { from: 8, insert: '\n' },
        selection: { anchor: 9 },
    }).state;
    const pending = split.update({ effects: [setEnterLine.of(2)] }).state;
    const commented = pending.update({
        changes: { from: 9, insert: '!' },
        userEvent: 'input.type',
    }).state;
    // Backspace removes the `!` without touching the line's break, so the
    // line is still the one the `Enter` created.
    const erased = commented.update({
        changes: { from: 9, to: 10 },
        userEvent: 'delete.backward',
    }).state;

    const typed = erased.update({
        changes: { from: 9, insert: '||b.com^' },
        userEvent: 'input.type',
    }).state;

    assert.deepEqual(enabledRuleLines(typed), [2]);
});

test('typing over the whole text of an enabled rule keeps it enabled', () => {
    const state = EditorState.create({
        doc: '||a.com^\n||b.com^',
        extensions: [breakpointState()],
    }).update({ effects: [replaceBreakpoints.of([2])] }).state;
    const line = state.doc.line(2);

    // Replace the rule's text without touching its line break.
    const typed = state.update({
        changes: { from: line.from, to: line.to, insert: '|' },
        userEvent: 'input.type',
    }).state;

    assert.equal(typed.doc.toString(), '||a.com^\n|');
    assert.deepEqual(enabledRuleLines(typed), [2]);
});

test('typing a comment marker at the start of an enabled rule drops its marker', () => {
    const state = EditorState.create({
        doc: '||a.com^',
        extensions: [breakpointState()],
    }).update({ effects: [replaceBreakpoints.of([1])] }).state;

    const commented = state.update({
        changes: { from: 0, insert: '!' },
        userEvent: 'input.type',
    }).state;

    assert.equal(commented.doc.toString(), '!||a.com^');
    // Comment lines cannot carry an enabled marker: the line is no longer a
    // rule, so its flag must not reach FLM.
    assert.deepEqual(enabledRuleLines(commented), []);
    assert.deepEqual(rulesFromState(commented), [{ enabled: false, rule: '!||a.com^' }]);
});

test('a comment marker inside an enabled rule keeps its marker', () => {
    const state = EditorState.create({
        doc: '||a.com^',
        extensions: [breakpointState()],
    }).update({ effects: [replaceBreakpoints.of([1])] }).state;

    // The line still starts with the rule text, so it is not a comment.
    const typed = state.update({
        changes: { from: 7, insert: '!' },
        userEvent: 'input.type',
    }).state;

    assert.equal(typed.doc.toString(), '||a.com!^');
    assert.deepEqual(enabledRuleLines(typed), [1]);
});

test('undo of turning an enabled rule into a comment restores its marker', () => {
    const state = EditorState.create({
        doc: '||a.com^',
        extensions: [breakpointState(), history()],
    }).update({ effects: [replaceBreakpoints.of([1])] }).state;

    const commented = state.update({
        changes: { from: 0, insert: '!' },
        userEvent: 'input.type',
    }).state;
    assert.deepEqual(enabledRuleLines(commented), []);

    const undone = runCommand(commented, undo);
    assert.equal(undone.doc.toString(), '||a.com^');
    // The marker was dropped by the change, not toggled off by the user.
    assert.deepEqual(enabledRuleLines(undone), [1]);

    const redone = runCommand(undone, redo);
    assert.equal(redone.doc.toString(), '!||a.com^');
    assert.deepEqual(enabledRuleLines(redone), []);
});

test('undo of replacing an enabled rule with a comment restores its marker', () => {
    const state = EditorState.create({
        doc: '||a.com^\n||b.com^',
        extensions: [breakpointState(), history()],
    }).update({ effects: [replaceBreakpoints.of([2])] }).state;
    const line = state.doc.line(2);

    // Type over the whole rule text with a comment marker.
    const commented = state.update({
        changes: { from: line.from, to: line.to, insert: '!' },
        userEvent: 'input.type',
    }).state;
    assert.deepEqual(enabledRuleLines(commented), []);

    const undone = runCommand(commented, undo);
    assert.equal(undone.doc.toString(), '||a.com^\n||b.com^');
    assert.deepEqual(enabledRuleLines(undone), [2]);
});

test('a rule merged into a comment line above is dropped and restored on undo', () => {
    const doc = '! note\n||a.com^';
    const state = EditorState.create({
        doc,
        extensions: [breakpointState(), history()],
    }).update({
        // The caret sits at the start of the enabled rule.
        selection: { anchor: 7 },
        effects: [replaceBreakpoints.of([2])],
    }).state;

    // Backspace joins the rule to the comment line above.
    const merged = runCommand(state, deleteCharBackward);
    assert.equal(merged.doc.toString(), '! note||a.com^');
    // The merged line is a comment, so it cannot carry the marker.
    assert.deepEqual(enabledRuleLines(merged), []);

    const undone = runCommand(merged, undo);
    assert.equal(undone.doc.toString(), doc);
    assert.deepEqual(enabledRuleLines(undone), [2]);
});
