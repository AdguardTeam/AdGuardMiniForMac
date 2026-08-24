/**
 * Search states
 */
export declare enum SearchState {
    /**
     * Query is empty but results exists (not filtered)
     */
    EMPTY_QUERY_HAS_RESULTS = 0,
    /**
     * Query exists and results exists (filtered)
     */
    HAS_QUERY_HAS_RESULTS = 1,
    /**
     * Query filter returns empty results
     */
    HAS_QUERY_EMPTY_RESULTS = 2,
    /**
     * Empty query, empty results (not filtered, no data)
     */
    EMPTY_QUERY_EMPTY_RESULTS = 3
}
