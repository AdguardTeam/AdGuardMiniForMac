// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Event action unsubscribe callback
 */
export type Unsubscribe = () => void;

/**
 * Type-safe event action
 */
export class Action<TArgs = void> {
    private readonly listeners = new Set<(...args: ArgsTuple<TArgs>) => void>();

    /**
     * Get number of listeners
     */
    public get size(): number {
        return this.listeners.size;
    }

    /**
     * Subscribe to event
     */
    public addEventListener(listener: (...args: ArgsTuple<TArgs>) => void): Unsubscribe {
        this.listeners.add(listener);
        return () => this.removeEventListener(listener);
    }

    /**
     * Unsubscribe from event
     */
    public removeEventListener(listener: (...args: ArgsTuple<TArgs>) => void): void {
        this.listeners.delete(listener);
    }

    /**
     * Subscribe to event once
     */
    public once(listener: (...args: ArgsTuple<TArgs>) => void): Unsubscribe {
        const wrapper = (...args: ArgsTuple<TArgs>) => {
            this.listeners.delete(wrapper);
            listener(...args);
        };
        this.listeners.add(wrapper);
        return () => this.removeEventListener(wrapper);
    }

    /**
     * Emit event
     */
    public invoke(...args: ArgsTuple<TArgs>): void {
        for (const listener of Array.from(this.listeners)) {
            try {
                listener(...args);
            } catch (e) {
                log.error(`Action listener threw: ${e}`);
            }
        }
    }

    /**
     * Clear all listeners
     */
    public removeAllListeners(): void {
        this.listeners.clear();
    }
}
