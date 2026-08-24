import { ConstantMessageException } from './ConstantMessageException';
/** Platform rejection marker class. */
export declare class PlatformException extends ConstantMessageException {
    readonly uniqIdSlot: string | undefined;
    readonly extraSlot: string;
    readonly platformMessage: string;
    /** Ctor. `extraSlot` is required. */
    constructor(constantMessage: string, uniqIdSlot: string | undefined, extraSlot: string, platformMessage: string);
}
