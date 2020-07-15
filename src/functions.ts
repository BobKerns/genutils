/**
 * @module genutils
 * Copyright ©  by Bob Kerns. Licensed under MIT license
 */

/**
 * Functions to test (as typeguards) and coerce generators, iterators, etc.
 *
 * @packageDocumentation
 * @module functions
 * @preferred
 */


import type {Async, Sync, Genable} from "./types";

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
export const isGenable = <T>(g: Iterator<T>|Iterable<T>|Generator<T>|any): g is Genable<T> =>
    g && (isIterator(g) || isIterable(g));


export const isAsyncGenable = <T>(g: AsyncIterator<T>|AsyncIterable<T>|AsyncGenerator<T>|any): g is Genable<T, Async> =>
    g && (isAsyncIterator(g) || isAsyncIterable(g) || isIterable(g));

/**
 * Predicate/type guard to determine if an object is (or looks like, structurally) a Generator.
 * @param g
 */
export const isGenerator = <T>(g: Genable<T>|any): g is Generator<T> =>
    g &&
    isFunction(g.next)
    && isFunction(g.return)
    && isFunction(g.throw)
    && isFunction(g[Symbol.iterator]);

/**
 * Predicate/type guard to determine if an object is (or looks like, structurally) a AsyncGenerator.
 * @param g
 */
export const isAsyncGenerator = <T>(g: Genable<T, Async>|any): g is AsyncGenerator<T> =>
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
export function toGenerator<T>(i: Genable<T>): Generator<T> {
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
        return toGenerator(i[Symbol.iterator]());
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
export function toAsyncGenerator<T>(i: Genable<T, Async>|Genable<T, Sync>): AsyncGenerator<T> {
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
        return toAsyncGenerator(i[Symbol.asyncIterator]());
    } else if (isIterable(i)) {
        return toAsyncGenerator(i[Symbol.iterator]());
    } else {
        throw new Error(`Not iterable: ${i}`);
    }
}

/**
 * Coerce a sync [[Genable]] object to an `Iterator`. If the object is a `Generator` or an `Iterator` it is returned,
 * while if it is an `Iterable`, `[Symbol.iterator]`() is invoked.
 * @param i
 */
export function toIterator<T>(i: Genable<T>): Iterator<T> {
    if (isGenerator(i)) return i;
    if (isIterator(i)) return i;
    if (isIterable(i)) {
        return i[Symbol.iterator]();
    } else {
        throw new Error(`Not iterable: ${i}`);
    }
}


/**
 * Coerce an async [[Genable]] object to an `AsyncIterator`. If the object is a `Generator` or an `Iterator` it is returned,
 * while if it is an `Iterable`, `[Symbol.iterator]`() is invoked.
 * @param i
 */
export function toAsyncIterator<T>(i: Genable<T, Async>): AsyncIterator<T> {
    if (isAsyncGenerator(i)) return i;
    if (isAsyncIterator(i)) return i;
    if (isAsyncIterable(i)) {
        return i[Symbol.asyncIterator]();
    } else if (isIterable(i)) {
        return asyncAdaptor(toIterator(i));
    } else {
        throw new Error(`Not iterable: ${i}`);
    }
}

const asyncAdaptor = <T>(i: Iterator<T>): AsyncGenerator<T> => {
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
export function toIterable<T>(i: Genable<T>): Iterable<T> {
    if (isIterable(i)) return i;
    return {
        [Symbol.iterator]: () => i
    };
}


/**
 * Coerce a [[Genable]] object to `AsyncIterable`. If it is already an `AsyncIterable`, it is returned
 * unchanged. If it is an `AsyncIterator`, it is wrapped in an object with a `[Symbol.asyncIterator]`
 * method that returns the supplied iterator.
 * @param i
 */
export function toAsyncIterable<T>(i: Genable<T, Async>): AsyncIterable<T> {
    if (isAsyncIterable(i)) return i;
    if (isIterable(i)) {
        return toAsyncIterable_adaptor(i);
    }
    return {
        [Symbol.asyncIterator]: () => i as AsyncIterator<T>
    };
}

async function* toAsyncIterable_adaptor<T>(iterable: Iterable<T>): AsyncGenerator<T> {
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
export function toIterableIterator<T>(i: Genable<T, Sync>): IterableIterator<T> {
    if (isIterable(i) && isIterator(i)) return i;
    if (isIterable(i)) {
        // Invoke [Symbol.iterator]() just once, on first use.
        let _it: Iterator<T>|undefined = undefined;
        const it = () => _it ?? (_it = i[Symbol.iterator]());
        const iit: IterableIterator<T> = {
            [Symbol.iterator]: () => iit,
            next: () => it().next(),
            return: it().return && ((val) => it().return!(val)),
            throw: it().throw && ((val) => it().throw!(val))
        };
        return iit;
    }
    if (isIterator(i)) {
        const iit: IterableIterator<T> = {
            [Symbol.iterator]: () => iit,
            next: (val: any) => i.next(val),
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
export function toAsyncIterableIterator<T>(i: Genable<T, Async>): AsyncIterableIterator<T> {
    if (isAsyncIterable(i) && isAsyncIterator(i)) return i;
    if (isAsyncIterable(i)) {
        // Invoke [Symbol.iterator]() just once, on first use.
        let _it: AsyncIterator<T>|undefined = undefined;
        const it = () => _it ?? (_it = i[Symbol.asyncIterator]());
        const iit: AsyncIterableIterator<T> = {
            [Symbol.asyncIterator]: () => iit,
            next: () => it().next(),
            return: it().return && ((val) => it().return!(val)),
            throw: it().throw && ((val) => it().throw!(val))
        };
        return iit;
    }
    if (isIterable(i)) {
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
export const isIterator = <K>(i: Iterable<K> | any): i is Iterator<K> =>
    i && typeof i.next === 'function';

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `AsyncIterator` protocol (has a `next()` method).
 *
 * Note: There is no way to statically distinguish between an `Iterator` and an `AsyncIterator`. You will get
 * runtime errors if you don't anticipate the distinction.
 * @param i
 */
export const isAsyncIterator = <K>(i: AsyncIterable<K> | any): i is AsyncIterator<K> =>
    i && typeof i.next === 'function';

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `Iterable` protocol (has a `[Symbol.iterator]`
 * method).
 * @param i
 */
export const isIterable = <K>(i: Iterable<K> | any): i is Iterable<K> =>
    i && typeof i[Symbol.iterator] === 'function';

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `AsyncIterable` protocol (has a `[Symbol.asyncIterator]`
 * method).
 * @param i
 */
export const isAsyncIterable = <K>(i: AsyncIterable<K> | any): i is AsyncIterable<K> =>
    i && typeof i[Symbol.asyncIterator] === 'function';

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `Iterable` protocol (has a `[Symbol.iterator]`
 * method) and the `Iterator` protocol (a next() method).
 * @param i
 */
export const isIterableIterator = <K>(i: Iterable<K>|Iterator<K>|any): i is IterableIterator<K> =>
    isIterator(i) && isIterable(i);

/**
 * Predicate/type guard, returns `true` if the argument satisfies the `AsyncIterable` protocol (has a `[Symbol.asyncIterator]`
 * method) and the `AsyncIterator` protocol (a next() method).
 * @param i
 */
export const isAsyncIterableIterator = <K>(i: Iterable<K>|Iterator<K>|any): i is IterableIterator<K> =>
    isAsyncIterator(i) && isAsyncIterable(i);

