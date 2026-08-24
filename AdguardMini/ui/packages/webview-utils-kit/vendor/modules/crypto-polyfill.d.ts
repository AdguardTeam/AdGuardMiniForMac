/**
 * Web Crypto-compatible `getRandomValues` polyfill. Declared with a
 * signature matching the Web Crypto API instead of `any` so consumers get
 * compile-time type safety on the returned buffer.
 */
declare function getRandomValues<T extends ArrayBufferView | null>(array: T): T;
