/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */
/**
 * Turn events/imperative calls into values returned by an async generator.
 * @module events
 * @packageDocumentation
 * @preferred
 */

import Denque from 'denque';

/**
 * Interface for controlling the generators returned by {@link eventToGenerator}.
 */
export interface Controller<T, E = T | any> {
    /**
     * Queue _v_ to the generator.
     * @param v
     */
    send(v: T): void,

    /**
     * Queue _e_ (optional) to be returned by the generator, ending it.
     * @param e
     */
    end(e?: E): void,

    /**
     * Queue an error to be thrown by the generator, ending it.
     * @param err
     */
    throw(err: Error): void;

    /**
     * Clear all pending values queued to the generator.
     */
    clear(): void;
}

const endTag = Symbol.for("endTag");
const returnMsg = {[endTag]: 'return'};
const throwMsg = {[endTag]: 'throw'};
type ReturnMsg<R> = typeof returnMsg & {value: R};
type ThrowMsg = typeof throwMsg & {value: Error};
type EndMsg<R> = ReturnMsg<R> | ThrowMsg;
const isReturnMsg = <R>(m: any): m is ReturnMsg<R> => m instanceof Object && (m[endTag] === 'return');
const isThrowMsg = (m: any): m is ThrowMsg => m instanceof Object && (m[endTag] === 'throw');

/**
 * A queue usable by {@link eventToGenerator}.
 */
export interface Queue<T extends any> {
    length: number;
    push(value: T): number;
    shift(): T | undefined;
    clear(): void;
}

/**
 * A factory function that returns a {@link Queue}. It will be called with no arguments.
 */
export type QueueFactory<T> = () => Queue<T>;

/**
 * async generator function `eventToGenerator`(_queue_) returns _[generator, controller]_
 *
 * Create a generator that can be made to return values to be supplied by a callback.
 * * _queue_: A {@link QueueFactory} function that returns the {@link Queue} to use.
 * * _generator_: The generator being controlled.
 * * _controller_: A {@link Controller} object with the following:
 * >   * `send(`_value_`)`: send the next value to generate.
 * >   * `end()`: Cause the generator to end
 * >   * `throw(`_error_`)`: Cause the generator to throw an exception.
 * >   * `clear()`: Remove any pending queue items.
 *
 * `end` and `throw` are synchronous with the queue. That is, they cause the queue to end or throw
 * when the consumer of the generator has read everything prior in the queue.
 *
 * _queue_ should return a {@link Queue} object that implements `.length`, `.push()`, `.shift()`, and `.clear()`.
 * The default implementation is [Denque](https://github.com/invertase/denque), which is fast for unbounded size.
 *
 * The returned generator may be enhanced with {@link Async_.enhance|Async.enhance} if desired.
 *
 * Other {@link QueueFactory} functions provided:
 * * {@link queue1}: returns a "queue" of maximum length 1. Older entries are discarded.
 * * {@link queueSticky}`: Returns a queue that returns the last value seen, forever (or until cleared).
 * * {@link queueOldest}_(n)_: Call with _n_ to set the size; when full new values are discarded.
 * * {@link queueNewest}_(n)_: Call with _n_ to set the size; when full old values are discarded.
 * * {@link queueUnique}: Returns a queue that discards duplicate enqueued values.
 * @returns [AsyncGenerator, {@link Controller}]
 */
export const eventToGenerator = <T, R = void>(queue: QueueFactory<T | EndMsg<R>> = () => new Denque()): [AsyncGenerator<T, R>, Controller<T>] => {
    let unblock: (v?: any) => void = () => undefined;
    let waiter = null;
    const q = queue();
    const send = (v?: any) => (q.push(v), unblock());
    class EventController implements Controller<T> {
        send(v?: T) {
            return send(v);
        }
        end(value?: T) {
           return send({[endTag]: 'return', value})
        }
        throw(value: Error) {
            return send({ [endTag]: 'throw', value });
        }
        clear() { return q.clear(); }
    }
    async function* eventToGenerator(): AsyncGenerator<T, R> {
        while (true) {
            while (!q.length) {
                waiter = new Promise(a => (unblock = a));
                await waiter;
                waiter = null;
                unblock = () => undefined;
            }
            const v = q.shift();
            if (isReturnMsg<R>(v)) return v.value;
            if (isThrowMsg(v)) {
                throw v.value;
            }
            yield v as T;
        }
    }
    return [
        eventToGenerator(),
        new EventController()
    ];
}

/**
 * A {@link QueueFactory} that returns a {@link Queue} of maximum length 1, which discards older values.
 */
export const queue1 = <V>(): Queue<V> => {
    let value: V | undefined,
        empty = true;
    class Queue1 implements Queue<V> {
        get length() { return empty ? 0 : 1}
        push(v: V) {
            empty = false;
            value = v;
            return 1;
        }
        shift() {
            empty = true;
            const tmp = value;
            value = undefined;
            return tmp;
        }
        clear() {
            empty = true;
            value = undefined;
        }
    }
    return new Queue1();
};

/**
 * A {@link QueueFactory} that returns a {@link Queue} of maximum length 1, which discards older
 * values, but returns the last seen forever (until cleared).
 */
export const queueSticky = <V>(): Queue<V> => {
    let value: V | undefined,
        empty = true;
    class QueueSticky implements Queue<V> {
        get length() { return empty ? 0 : 1}
        push(v: V) {
            empty = false;
            value = v;
            return 1;
        }
        shift() {
            return value;
        }
        clear() {
            empty = true;
            value = undefined;
        }
    }
    return new QueueSticky();
}

/**
 * Make a {@link QueueFactory} that returns a {@link Queue} of maximum length _n_,
 * which discards newer values.
 * @param n the number of entries, default = `1`.
 */
export const queueOldest = <V>(n: number = 1): QueueFactory<V> => {
    return (): Queue<V> => {
        const queue = new Denque();
        class QueueOldest implements Queue<V> {
            get length() { return queue.length};
            push(v: V) {
                if (queue.length < n) {
                    return queue.push(v);
                }
                // Otherwise, we let it drop.
                return queue.length;
            }
            shift() { return queue.shift(); }
            clear() { return queue.clear(); }
        }
        return new QueueOldest();
    };
};

/**
 * Make a {@link QueueFactory} that returns a {@link Queue} of maximum length _n_, which discards older values.
 * @param n the number of entries, default = `1`.
 */
export const queueNewest = <V>(n: number = 1): QueueFactory<V> => {
    return (): Queue<V> => {
        const queue = new Denque();
        class QueueNewest implements Queue<V> {
            get length() { return queue.length; }
            push(v: V) {
                while (queue.length >= n) {
                    queue.shift();
                }
                return queue.push(v);
            }
            shift() {
                return queue.shift();
            }
            clear() {
                return queue.clear();
            }
        }
        return new QueueNewest();
    };
};

export type KeyFn = (k: any) => any;
export interface QueueUniqueSpec {
    newest?: boolean;
    keyFn?: KeyFn;
}
/**
 * function queueUnique({newest, keyFn}): () =>
 *
 * Return a {@link QueueFactory}, which supplies {@link Queue} instances that discard
 * already-enqueued entries. Values can be re-enqueued once delivered.
 * * _newest_: if `false` (the default), values are dequeued in the order they were first enqueued. Using `{newest: true}` deprioritizes more active values so less-busy items can get through. But in a sustained-busy situation, there is no guarantee they will ever be delivered. This can be an advantage or disadvantage, depending on requirements.
 * * _keyFn_: A function to identify what values count as "equal". The default regards +0 and -0 as the same, NaN's as all the same, and otherwise behaves as `===`.
 * @param spec a {@link QueueUniqueSpec}
 */
export const queueUnique = <E>(spec?: QueueUniqueSpec): QueueFactory<E> => {
    const fn = (newest: boolean, keyFn: KeyFn) => (): Queue<E> => {
        const queue = new Map();
        let iter: null | Iterator<E> = null;
        class QueueUnique implements Queue<E> {
            get length() { return queue.size; }
            push(v: any) {
                const k = keyFn(v);
                if (newest) {
                    // As I read the spec, this should not be needed, but experimentally
                    // in Chrome, it is.
                    queue.delete(k);
                    queue.set(k, v);
                } else if (!queue.has(k)) {
                    queue.set(k, v);
                }
                return queue.size;
            }
            shift() {
                if (!iter) {
                    iter = queue.values();
                }
                const r = iter.next();
                if (r.done) {
                    // If values had been added later, they would turn up
                    // in the iterator, so we're done.
                    iter = null;
                    return undefined;
                }
                return r.value;
            }
            clear() {
                return queue.clear();
            }
        }
        return new QueueUnique();
    };
    if (spec === undefined) {
        // Called without specifying a length, just return a size=1 queue.
        return fn(false, i => i);
    }
    // Return a function to construct queues of the specified size.
    return fn(!!spec.newest, spec.keyFn || (i => i));
};

/**
 * Accepts objects, and returns just the fields that have changed (are no longer `===`).
 *
 * This does not distinguish between deleted keys and keys assigned a value of `undefined` in the input.
 * In the output, a deleted key is represented as present with a value of `undefined`.
 *
 * @param init The initial value
 */
export const queueUpdateShallow = <E extends object>(init: Partial<E> = {}) => (): Queue<Partial<E>> => {
    const state: Partial<E> = { ...init };
    let pending: Partial<E> = {};
    let hasPending = false;
    class QueueUpdateShallow implements Queue<Partial<E>> {
        get length() { return (hasPending ? 1 : 0); }
        push(v: E) {
            const check = (k: Partial<E>) => (Object.keys(k) as (keyof E)[]).forEach(k => {
                if (state[k] !== v[k]) {
                    pending[k] = v[k];
                    hasPending = true;
                }
            });
            check(state);
            check(v);
            return 1;
        }
        shift() {
            try {
                return pending;
            } finally {
                Object.assign(state, pending);
                this.clear();
            }
        }
        clear() {
            pending = {};
            hasPending = false;
        }
    }
    return new QueueUpdateShallow();
};
