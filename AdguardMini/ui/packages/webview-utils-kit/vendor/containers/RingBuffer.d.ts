/** Ring buffer. */
export declare class RingBuffer<T> {
    protected readonly size: number;
    /** Fixed-size container. */
    protected array: T[];
    /** Current position. */
    protected cursor: number;
    /** Defined elements count. */
    protected fillLength: number;
    /** Ctor. */
    constructor(size: number);
    /** Push value to buffer. */
    push(value: T): void;
    /** Return values from cursor wrap-order. */
    toArray(): T[];
}
