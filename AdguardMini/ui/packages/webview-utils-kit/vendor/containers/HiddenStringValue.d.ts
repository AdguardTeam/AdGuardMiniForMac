declare const hiddenValueProperty: unique symbol;
/** Carries public and hidden values of the same string. */
export declare class HiddenStringValue extends String {
    /** Hidden value. */
    protected readonly [hiddenValueProperty]: string;
    /** @deprecated This property is ambiguous; use `publicLength`. */
    get length(): number;
    /** Public string length. */
    get publicLength(): number;
    /** Ctor. */
    constructor(publicValue?: string, hiddenValue?: string);
    /** Hidden value length. */
    get hiddenLength(): number;
    /** Get hidden value. */
    getHiddenValue(): string;
    /** Check equality with another instance. */
    isEqual(other: HiddenStringValue | string): boolean;
}
export {};
