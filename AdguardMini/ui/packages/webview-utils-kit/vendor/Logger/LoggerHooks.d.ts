/** Hook fired before preparing logger method args. */
export type BeforePrepareArgsHook<T = any[]> = (args: T) => T;
/** Logger hooks. */
export declare class LoggerHooks {
    /** Map `{(message:caller?) => hook}`. */
    protected beforePrepareArgsHooks: Map<string, BeforePrepareArgsHook<any[]>>;
    /** Add a `BeforePrepareArgsHook`. */
    setBeforePrepareArgsHook(message: string, caller: string, hook: BeforePrepareArgsHook): void;
    /** Call a `BeforePrepareArgsHook`. */
    tapBeforePrepareArgsHook(message: string, caller: string | undefined, args: any[]): any[];
    /** Key generation helper. */
    protected joinArgsForKey(...keys: string[]): string;
}
