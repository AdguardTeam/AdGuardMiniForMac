// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/** Default trailing-edge delay for the editor working-set parse. */
const SYNC_DEBOUNCE_MS = 300;

/**
 * Trailing-edge debounce for a single shared job: the user-rules editor's
 * full-document parse. Keeping the working set in sync re-tokenizes every
 * line (`getRulesFromEditor` walks the whole document), which blocks the
 * WebContent main thread for a noticeable amount of time on large rule sets,
 * so it must not run on every keystroke. Consumers schedule the parse while
 * typing and flush it once before reading `editorStore.rules` (Save).
 */
class DebouncedJob {
    private timer: ReturnType<typeof setTimeout> | null = null;

    /** The runnable job currently awaiting its debounce delay, if any. */
    private queuedRun: (() => void) | null = null;

    /**
     * Run a queued job immediately and cancel its timer. No-op when nothing
     * is queued.
     */
    private runQueued(): void {
        const run = this.queuedRun;
        this.queuedRun = null;
        if (run) {
            run();
        }
    }

    /**
     * Schedule `run` to fire `delayMs` after the most recent schedule call.
     * Re-scheduling while a job is queued replaces it and resets the timer,
     * so only the last requested job runs (trailing edge).
     */
    public schedule(run: () => void, delayMs: number = SYNC_DEBOUNCE_MS): void {
        this.queuedRun = run;
        if (this.timer !== null) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.timer = null;
            this.runQueued();
        }, delayMs);
    }

    /**
     * Execute a queued job immediately and cancel its timer. No-op when
     * nothing is queued.
     */
    public flush(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.runQueued();
    }

    /**
     * Drop any queued job and cancel its timer. Used when the editor is
     * re-seeded from the store or torn down, so a stale parse cannot write an
     * outdated working set.
     */
    public cancel(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.queuedRun = null;
    }
}

/** Shared debouncer for the user-rules editor working-set parse. */
export const debouncedEditorSync = new DebouncedJob();
