/**
 * Hook is used for debounce callback functions
 * @param callback - function to debounce
 * @param waitMs - delay time
 * @param deps array of dependencies
 */
export declare function useDebouncedCallback<A extends unknown[]>(
    callback: (...args: A) => any,
    waitMs: number,
    deps?: unknown[],
): (...args: A) => void;
