import type { RefObject } from 'preact';
/** `useScrollListener` handler type. */
type UseScrollListenerHandler = (event: Event) => void;
/** Add scroll listener to a DOM element. */
export declare function useScrollListener<T extends HTMLElement = HTMLElement>(target: RefObject<T>, callback: UseScrollListenerHandler): void;
export {};
