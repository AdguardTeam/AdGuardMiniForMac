import { SearchState } from '../searchState';
type UseSearchOptions = {
    highlightOnlySearchTerm?: boolean;
};
type TopLevelKeys<T> = Extract<keyof T, string>;
type NestedKeys<T> = {
    [K in keyof T & string]: T[K] extends Record<string, any> ? `${K}.${Extract<keyof T[K], string>}` : never;
}[keyof T & string];
export type SearchKeys<T> = TopLevelKeys<T> | NestedKeys<T>;
/** Fuzzy search by item keys. */
export declare function useSearch<T>(items: T[], keys: ReadonlyArray<SearchKeys<T>>, initialSearch?: string, options?: UseSearchOptions): {
    foundItems: T[];
    searchState: SearchState;
    searchQuery: string;
    highlight: string[];
    updateSearchQuery: import("preact/hooks").StateUpdater<string>;
};
export {};
