import { RingBuffer } from '../containers';
import { LoggerHooks } from './LoggerHooks';
/** Logger log level. */
export declare enum LogLevel {
    DBG = 0,
    INF = 1,
    ERR = 2
}
/** Custom logger implementation. */
export declare class Logger {
    protected logLevel: LogLevel;
    protected readonly prettyPrint: boolean;
    /** Hooks helper. */
    readonly loggerHooks: LoggerHooks;
    /** Ring buffer for logs. */
    protected readonly buffer: RingBuffer<string>;
    /** Ctor. */
    constructor(logLevel: LogLevel, bufferSize: number, prettyPrint: boolean);
    /** Set log level. */
    setLogLevel(logLevel: LogLevel): void;
    /** Info log (used for dummy backend too). */
    info(message: string, func?: string, ...args: any[]): void;
    /** Debug log. */
    dbg(message: string, func?: string, ...args: any[]): void;
    /** Error log. */
    error(message: string, func?: string, ...args: any[]): void;
    /** Internal logging function. */
    protected logMessage(logLevel: LogLevel, message: string, caller?: string, ...args: any[]): void;
    /** Return buffered logs as newline-joined stack. */
    getStack(): string;
}
