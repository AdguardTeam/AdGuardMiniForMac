// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Queue that has only 2 places, it is needed to ignore all intermediate calls;
 */
class TwoPlaceQueue<T> {
    private next?: T;

    private last?: T;

    /**
     * Returns currents element and sets last elem in queue for current
     */
    public getNext() {
        const toReturn = this.next;
        this.next = this.last;
        this.last = undefined;
        return toReturn;
    }

    /**
     * Check that queue has next element
     */
    public hasNext() {
        return !!this.next;
    }

    /**
     * Append element to queue
     */
    public push(data: T) {
        if (!this.next) {
            this.next = data;
        } else {
            this.last = data;
        }
    }

    /**
     * Replace the pending element with the given one, dropping any
     * intermediate element. Used when a debounce delay is configured so
     * only the latest call survives.
     */
    public replace(data: T) {
        this.next = data;
        this.last = undefined;
    }
}

/**
 * Debounces calls to the platform, ignoring all intermediate updates and
 * saving only the last element. See TwoPlaceQueue.
 *
 * When `delayMs` is provided, the action runs only after `delayMs`
 * milliseconds of inactivity, so rapid consecutive calls collapse into a
 * single call carrying the latest payload.
 *
 * @param action - Action to debounce.
 * @param name - Debug log label identifying the debounced call.
 * @param delayMs - Optional debounce delay in milliseconds. When omitted,
 * the action is invoked as soon as the previous call completes.
 */
export function withLast<T, Res>(
    action: (data: T) => Promise<Res>,
    name: string,
    delayMs?: number,
): (data?: T) => Promise<Res | undefined> {
    let isBusy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const buffer: TwoPlaceQueue<T> = new TwoPlaceQueue();

    /**
     * Dispatch the pending element unless a call is already in flight.
     * Returns the action promise when dispatched, undefined otherwise.
     */
    const dispatchNext = (): Promise<Res | undefined> | undefined => {
        if (isBusy || !buffer.hasNext()) {
            return;
        }

        isBusy = true;
        return action(buffer.getNext()!).finally(() => {
            isBusy = false;
            log.dbg(`With last call action: isBusy - ${isBusy}`, `Enqueue finally ${name}`);
            if (buffer.hasNext()) {
                scheduleNext();
            }
        });
    };

    /**
     * Schedule the next dispatch after the debounce delay; without a delay
     * the dispatch happens immediately.
     */
    const scheduleNext = (): Promise<Res | undefined> | undefined => {
        if (delayMs === undefined) {
            return dispatchNext();
        }

        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            timer = undefined;
            dispatchNext();
        }, delayMs);
        return undefined;
    };

    return async function enqueue(data?: T) {
        log.dbg(`With last call: isBusy - ${isBusy}`, `Enqueue: ${name}`);
        if (data) {
            // While a call is in flight there is no timer, so keying off
            // `timer` would fall through to `push` and let an intermediate
            // state reach the platform. The debounce mode must always
            // replace the pending element.
            if (delayMs !== undefined) {
                buffer.replace(data);
            } else {
                buffer.push(data);
            }
        }

        if (!isBusy) {
            return scheduleNext();
        }
        return undefined;
    };
}
