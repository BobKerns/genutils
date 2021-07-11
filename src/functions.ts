/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */
/**
 * Functions to test (as typeguards) and coerce generators, iterators, etc.
 *
 * @packageDocumentation
 * @module functions
 * @preferred
 */


import type {Async, Sync, Genable, FullIterable, FullIterableIterator} from "./types";

/**
 * Predicate/Type Guard for any function.
 * @param f
 */
export const isFunction = <A extends Function>(f: (A | any)): f is A => {
    return typeof f === 'function';
}

/**
 * Predicate/type guard to determine if an object is [[Genable]]. An object is [[Genable]] if it
 * supports the `Iterator` or `Iterable` protocols. (Generators support both).
 * @param g
 */
export const isGenable = <T, TReturn = T, TNext = T>(g: Iterator<T, TReturn, TNext>|Iterable<T>|Generator<T, TReturn, TNext>|any):
    g is Genable<T, Sync, TReturn, TNext> =>
        g && (isIterator(g) || isIterable(g));


export const isAsyncGenable = <T, TReturn, TNext>(g: AsyncIterator<T, TReturn, TNext>|AsyncIterable<T>|AsyncGenerator<T,TReturn,TNext>|any):
    g is Genable<T, Async, TReturn, TNext> =>
        g && (isAsyncIterator<T, TReturn, TNext>(g) || isAsyncIterable<T, TReturn, TNext>(g) || isIterable<T, TReturn, TNext>(g));

/**
 * Predicate/type guard to determine if an object is (or looks like, structurally) a Generator.
 * @param g
 */
export const isGenerator = <T, TReturn, TNext>(g: Genable<T, Sync, TReturn, TNext>|any): g is Generator<T, TReturn, TNext> =>
    g &&
    isFunction(g.next)
    && isFunction(g.return)
    && isFunction(g.throw)
    && isFunction(g[Symbol.iterator]);

/**
 * Predicate/type guard to determine if an object is (or looks like, structurally) a AsyncGenerator.
 * @param g
 */
export const isAsyncGenerator = <T, TReturn, TNext>(g: Genable<T, Async, TReturn, TNext>|any): g is AsyncGenerator<T> =>
    g &&
    isFunction(g.next)
    && isFunction(g.return)
    && isFunction(g.throw)
    && isFunction(g[Symbol.asyncIterator]);

/**
 * Coerce an object to an object that can act as a generator (that is, satisfy both `Iterator`
 * and `Iterable`).
 *
 * If it is an `Iterator` but not `Iterable`, or `Iterable` but not `Iterator`, it is wrapped
 * in a generator. This generator is __not__ enhanced. Use [[Sync.enhance]] on the result if
 * you need an enhanced generator.
 * @param i
 */
export function toGenerator<T, TReturn = T, TNext = T>(i: Genable<T, Sync, TReturn, TNext>): Generator<T, TReturn, TNext> {
    if (isGenerator(i)) return i;
    if (isIterator(i)) {
        const it = i;

        function* wrap() {
            while (true) {
                const r = it.next();
                if (r.done) return r.value;
                yield r.value;
            }
        }

        return wrap();
    } else if (isIterable(i)) {
        return toGenerator(i[Symbol.iterator]() as Iterator<T, TReturn, TNext>);
    } else {
        throw new Error(`Not iterable: ${i}`);
    }
}


/**
 * Coerce an object to an object that can act as a async generator (that is, satisfy both `Iterator`
 * and `Iterable`).
 *
 * If it is an `AsyncIterator` but not `AsyncIterable`, or `AsyncIterable` but not `AsyncIterator`,
 * it is wrapped in an async generator. This generator is __not__ enhanced. Use [[Async.enhance]] on the result if
 * you need an enhanced generator.
 * @param i
 */
export function toAsyncGenerator<T, TReturn, TNext>(i: Genable<T, Async, TReturn, TNext>|Genable<T, Sync, TReturn, TNext>):
    AsyncGenerator<T, TReturn, TNext>
{
    if (isAsyncGenerator(i)) return i;
    if (isAsyncIterator(i)) {
        const it = i;
        async function* wrap() {
            while (true) {
                const r = await it.next();
                if (r.done) return r.value;
                yield r.value;
            }
        }
        return wrap();
    } else if (isAsyncIterable(i)) {
        return toAsyncGenerator(i[Symbol.asyncIterator]()) as AsyncGenerator<T, TReturn, TNext>;
    } else if (isIterable(i)) {
        return toAsyncGenerator(i[Symbol.iterator]() as Iterator<T, TReturn, TNext>);
    } else {
        throw new Error(`Not iterable: ${i}`);
    }
}

/**
 * Coerce a sync [[Genable]] object to an `Iterator`. If the object is a `Generator` or an `Iterator` it is returned,
 * while if it is an `Iterable`, `[Symbol.iterator]`() is invoked.
 * @param i
 */
export function toIterator<T, TReturn, TNext>(i: Genable<T, Sync, TReturn, TNext>): Iterator<T, TReturn, TNext> {
    if (isGenerator(i)) return i;
    if (isIterator(i)) return i;
    if (isIterable(i)) {
        return i[Symbol.iterator]() as Iterator<T, TReturn, TNext>;
    } else {
        throw new Error(`Not iterable: ${i}`);
    }
}


/**
 * Coerce an async [[Genable]] object to an `AsyncIterator`. If the object is a `Generator` or an `Iterator` it is returned,
 * while if it is an `Iterable`, `[Symbol.iterator]`() is invoked.
 * @param i
 */
export function toAsyncIterator<T, TReturn, TNext = T>(i: Genable<T, Async, TReturn, TNext>): AsyncIterator<T, TReturn, TNext> {
    if (isAsyncGenerator(i)) return i;
    if (isAsyncIterable(i)) {
        return i[Symbol.asyncIterator]() as AsyncIterator<T, TReturn, TNext>;
    } else if (isIterable(i)) {
        return asyncAdaptor(toIterator(i));
    } else {
        throw new Error(`Not iterable: ${i}`);
    }
}

const asyncAdaptor = <T, TReturn, TNext>(i: Iterator<T, TReturn, TNext>):
    AsyncGenerator<T, TReturn, TNext> =>
{
    const it = i as unknown as AsyncIterator<T>;
    let self: AsyncGenerator<T> & {returning?: any};
    async function* asyncAdaptor(): AsyncGenerator<T> {
        let nr: any;
        let done = false;
        try {
            while (true) {
                const r = await Promise.resolve(it.next());
                if (r.done) {
                    done = true;
                    return r.value;
                }
                try {
                    nr = yield r.value;
                } catch (e) {
                    await it.throw?.(e);
                    throw(e);
                }
            }
        } finally {
            if (!done) {
                await i.return?.(self.returning);
            }
        }
    }
    return self = asyncAdaptor();
};

/**
 * Coerce a [[Genable]] object to `Iterable`. If it is already an `Iterable`, it is returned
 * unchanged. If it is an `Iterator`, it is wrapped in an object with a `[Symbol.iterator]`
 * method that returns the supplied iterator.
 * @param i
 */
export function toIterable<T, TReturn = T, TNext = T>(i: Genable<T,Sync,TReturn,TNext>):
    FullIterable<T, Sync, TReturn, TNext>
{
    if (isIterable(i)) return i as FullIterable<T, Sync, TReturn, TNext>;
    return {
        [Symbol.iterator]: () => i
    } as FullIterable<T, Sync, TReturn, TNext>;
}


/**
 * Coerce a [[Genable]] object to `AsyncIterable`. If it is already an `AsyncIterable`, it is returned
 * unchanged. If it is an `AsyncIterator`, it is wrapped in an object with a `[Symbol.asyncIterator]`
 * method that returns the supplied iterator.
 * @param i
 */
export function toAsyncIterable<T, TReturn, TNext>(i: Genable<T, Async, TReturn, TNext>):
    FullIterable<T, Async, TReturn, TNext>
{
    if (isAsyncIterable<T, TReturn, TNext>(i)) return i;
    if (isIterable<T, TReturn, TNext>(i)) {
        return toAsyncIterable_adaptor<T, TReturn, TNext>(i) as
            FullIterable<T, Async, TReturn, TNext>;
    }
    return {
        [Symbol.asyncIterator]: () => i
    } as FullIterable<T, Async, TReturn, TNext>;
}
async function* toAsyncIterable_adaptor<T, TReturn, TNext>(iterable: Iterable<T>):
    AsyncGenerator<T, TReturn, TNext>
{
    const it = iterable[Symbol.iterator]();
    let nr: any = undefined;
    while (true) {
        const r = await it.next(nr);
        if (r.done) return r.value;
        nr = yield r.value;
    }
}

// noinspection JSUnusedGlobalSymbols
/**
 * Similar to [[toGenerator]], but does not require the presence of `Generator.return` or `Generator.throw` methods.
 * @param i
 */
export function toIterableIterator<T, TReturn = T, TNext = T>(i: Genable<T, Sync, TReturn, TNext>): FullIterableIterator<T, Sync, TReturn, TNext> {
    if (isIterable(i) && isIterator(i)) return i as FullIterableIterator<T, Sync, TReturn, TNext>;
    if (isIterable(i)) {
        // Invoke [Symbol.iterator]() just once, on first use.
        let _it: Iterator<T>|undefined = undefined;
        const it = () => _it ?? (_it = i[Symbol.iterator]());
        const iit: FullIterableIterator<T, Sync, TReturn, TNext> = {
            [Symbol.iterator]: () => iit,
            next: (val?: TNext) => it().next(val as undefined),
            return: it().return && ((val) => it().return!(val)),
            throw: it().throw && ((val) => it().throw!(val))
        };
        return iit;
    }
    if (isIterator(i)) {
        const iit: FullIterableIterator<T, Sync, TReturn, TNext> = {
            [Symbol.iterator]: () => iit,
            next: (val?: TNext) => i.next(val!),
            return: i.return && ((val) => i.return!(val)),
            throw: i.throw && ((val) => i.throw!(val))
        }
        return iit;
    }
    throw new Error(`Not iterator nor iterable: ${i}`);
}


/**
 * Similar to [[toAsyncGenerator]], but does not require the presence of `AsyncGenerator.return` or
 * `AsyncGenerator.throw` methods.
 * @param i
 */
export function toAsyncIterableIterator<T, TReturn, TNext>(i: Genable<T, Async, TReturn, TNext>):
    FullIterableIterator<T, Async, TReturn, TNext>
{
    if (isAsyncIterable<T, TReturn, TNext>(i) && isAsyncIterator<T, TReturn, TNext>(i)) {
        return i as unknown as FullIterableIterator<T, Async, TReturn, TNext>;
    }
    if (isAsyncIterable<T, TReturn, TNext>(i)) {
        // Invoke [Symbol.iterator]() just once, on first use.
        let _it: AsyncIterator<T, TReturn, TNext>|undefined = undefined;
        const it = () => _it ?? (_it = i[Symbol.asyncIterator]() as AsyncIterator<T, TReturn, TNext>);
        const iit: AsyncIterableIterator<T> = {
            [Symbol.asyncIterator]: () => iit,
            next: () => it().next(),
            return: it().return && ((val) => it().return!(val)),
            throw: it().throw && ((val) => it().throw!(val))
        };
        return iit;
    }
    if (isIterable<T, TReturn, TNext>(i)) {
        return toAsyncIterable_adaptor(i);
    }
    if (isAsyncIterator(i)) {
        const iit: AsyncIterableIterator<T> = {
            [Symbol.asyncIterator]: () => iit,
            next: (val: any) => i.next(val),
            return: i.return && ((val) => i.return!(val)),
            throw: i.throw && ((val) => i.throw!(val))
        }
        return iit;
    }
    throw new Error(`Not iterator nor iterable: ${i}`);
}

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `Iterator` protocol (has a `next()` method).
 *
 * Note: There is no way to statically distinguish between an `Iterator` and an `AsyncIterator`. You will get
 * runtime errors if you don't anticipate the distinction.
 * @param i
 */
export const isIterator = <K, KReturn = K, KNext = K>(i: Iterable<K> | FullIterable<K, Sync, KReturn, KNext> | any):
    i is Iterator<K, KReturn, KNext> =>
        i && typeof i.next === 'function';

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `AsyncIterator` protocol (has a `next()` method).
 *
 * Note: There is no way to statically distinguish between an `Iterator` and an `AsyncIterator`. You will get
 * runtime errors if you don't anticipate the distinction.
 * @param i
 */
export const isAsyncIterator = <K, KReturn = K, KNext = K>(i: AsyncIterable<K> | AsyncIterator<K, KReturn, KNext>| any):
    i is AsyncIterator<K, KReturn, KNext> =>
        i && typeof i.next === 'function';

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `Iterable` protocol (has a `[Symbol.iterator]`
 * method).
 * @param i
 */
export const isIterable = <K, KReturn = K, KNext = K>(i: Iterable<K> | FullIterable<K, Sync, KReturn, KNext> | any): i is FullIterable<K, Sync, KReturn, KNext>  =>
    i && typeof i[Symbol.iterator] === 'function';

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `AsyncIterable` protocol (has a `[Symbol.asyncIterator]`
 * method).
 * @param i
 */
export const isAsyncIterable = <K, KReturn = K, KNext = K>(i: AsyncIterable<K> | FullIterable<K, Async, KReturn, KNext> | any):
    i is FullIterable<K, Async, KReturn, KNext> =>
        i && typeof i[Symbol.asyncIterator] === 'function';

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `Iterable` protocol (has a `[Symbol.iterator]`
 * method) and the `Iterator` protocol (a next() method).
 * @param i
 */
export const isIterableIterator = <K, KReturn = K, KNext = K>(i: Iterable<K>|Iterator<K, KReturn, KNext>|any):
    i is FullIterableIterator<K, Sync, KReturn, KNext> =>
        isIterator(i) && isIterable(i);

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `AsyncIterable` protocol (has a `[Symbol.asyncIterator]`
 * method) and the `AsyncIterator` protocol (a next() method).
 * @param i
 */
export const isAsyncIterableIterator = <K, KReturn = K, KNext = K>(i: Iterable<K>|Iterator<K, KReturn, KNext>|any):
    i is FullIterableIterator<K, Async, KReturn, KNext> =>
        isAsyncIterator(i) && isAsyncIterable(i);

/**
 * Wrap a function in a catch block.
 * @param f
 * @param onError Called when an error is thrown. The return value is returned. If not supplied, undefined is returned.
 */
export const doCatch = <A extends any[], R>(f: (...args: A) => R, onError?: (e: Error) => R):
    ((...args: A) => (R | undefined)) => {
    return (...args: A) => {
        try {
            return f(...args);
        } catch (e) {
            return onError?.(e);
        }
    };
};
