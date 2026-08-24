import type { RefObject } from 'preact';
/** Handle clicks outside provided element. */
export declare function useClickOutside(ref: RefObject<HTMLElement>, handler: () => void, exclusion?: RefObject<HTMLElement>): void;
