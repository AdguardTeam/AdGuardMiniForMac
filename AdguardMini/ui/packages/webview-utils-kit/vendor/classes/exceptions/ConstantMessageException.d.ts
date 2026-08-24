/** Holds constant message key; extra info is stored separately. */
export declare class ConstantMessageException extends Error {
    readonly uniqIdSlot?: string | undefined;
    readonly extraSlot?: string | undefined;
    /** Ctor. */
    constructor(constantMessage: string, uniqIdSlot?: string | undefined, extraSlot?: string | undefined);
    /** Build message from fields. */
    stringify(): string;
}
