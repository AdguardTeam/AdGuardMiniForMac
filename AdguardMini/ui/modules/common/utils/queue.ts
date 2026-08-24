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
}

/**
 * Decorator that used for debounce calls to platform and ignores all intermediate updates
 * Saves only last element. See TwoPlaceQueue.
 */
export function withLast<T, Res>(
    action: (data: T) => Promise<Res>,
    name: string,
): (data?: T) => Promise<Res | undefined> {
    let isBusy = false;
    const buffer: TwoPlaceQueue<T> = new TwoPlaceQueue();

    return async function enqueue(data?: T) {
        log.dbg(`With last call: isBusy - ${isBusy}`, `Enqueue: ${name}`);
        if (data) {
            buffer.push(data);
        }

        if (isBusy) {
            return;
        }

        isBusy = true;
        if (buffer.hasNext()) {
            return action(buffer.getNext()!).finally(() => {
                isBusy = false;
                log.dbg(`With last call action: isBusy - ${isBusy}`, `Enqueue finally ${name}`);
                if (buffer.hasNext()) {
                    enqueue();
                }
            });
        }
    };
}
