/** String wrap side mode. */
type WrapNewLinesType = 'r' | 'l' | 'rl';
/** Wrap string with new lines. */
export declare function wrapWithNewLines(str: string, type?: WrapNewLinesType): string;
/** ROT13 for one `[A-Za-z]` char code. */
export declare function rot13CharCode(charCode: number): string;
/** ROT13 for `[A-Za-z]` symbols only. */
export declare function rot13(string: string | number[]): string;
export {};
