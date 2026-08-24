/** Check whether value is a function. */
export declare function isFunction(obj: any): obj is (...args: any[]) => any;
/** Check whether value is a string. */
export declare function isString(obj: any): obj is string;
/** Check whether value is an object and not null. */
export declare function isObjectNonNull(obj: unknown): obj is Record<string, unknown>;
/** Check whether value is defined. */
export declare function isDefined<T>(value: T | undefined): value is T;
/** General truthy check including NaN handling. */
export declare function isTruthy<T>(value: T): value is Exclude<T, null | undefined | false | 0 | 0n | '' | typeof NaN>;
