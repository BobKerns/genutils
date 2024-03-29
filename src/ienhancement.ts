/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/retirement-simulator
 */

/**
 * Interface for enhanced operations, distinct from implementation. These apply to `Iterable` or `AsyncIterable` objects,
 * giving them the capability of acting similarly to lists, directly invoking methods like {@link IEnhancements.map | .map()}
 * or {@link IEnhancements.filter | .filter()}.
 *
 * @module IEnhancements
 */

import type { EnhancedGenerator } from "./sync-impl";
import type { Enhanced, FlatGen, Genable, IndexedFn, IndexedPredicate, Reducer, ReturnValue, SyncType } from "./types";

/**
 * Interface for enhanced operations, distinct from implementation. These apply to `Iterable` or `AsyncIterable` objects,
 * giving them the capability of acting similarly to lists, directly invoking methods like {@link IEnhancements.map | .map()}
 * or {@link IEnhancements.filter | .filter()}.
 *
 * The type parameter _S_ is either 'sync' or 'async', and controls whether synchronous or asynchronous interfaces are
 * used. The {@link ReturnValue|ReturnValue<T,S>} expands to _T_ or `Promise<`_T_`>`, accordingly.
 *
 * See {@link Sync.Mixin} and {@link Async.Mixin}.
 */
export interface IEnhancements<
        T, TReturn, TNext, S extends SyncType
        >
{
    /**
     * Return all of the values from this generator as an array. You do not want to call this on an
     * infinite generator (for obvious reasons); consider using [[IEnhancements.slice]] or
     * [[IEnhancements.limit]] to limit the size before calling this.
     */
    asArray(): ReturnValue<T[], S>;

    /**
     * Limit the number of values that can be generated. A `RangeError` is thrown if this limit is
     * exceeded. This is useful when you wish to abort an excessively large computation.
     *
     * Use [[IEnhancements.slice|]] with `0` as the first argument if you want to truncate.
     * @param max
     */
    limit(max: number): Enhanced<T, S, TReturn, TNext>

    /**
     * Operate on each value produced by this generator. The function _f_ is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Value to be supplied as context `this` for function _f_.
     */
    forEach(f: IndexedFn<T, void, S>, thisArg?: any): void;

    /**
     * Apply the function to each value yielded by this generator. It is called with two arguments,
     * the value yielded, and a sequential index. The return value is a generator that yields the
     * values produced by the function.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     */
    map<V>(f: IndexedFn<T, V, S>, thisArg?: any): Enhanced<V, S, TReturn, TNext>;


    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     */
    filter(f: IndexedPredicate<T, S>, thisArg?: any): Enhanced<T, S, TReturn, TNext>;

    /**
     * Flatten the values yielded by this generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth (default = 1)
     */
    flat<D extends number = 1>(depth?: D): Enhanced<S, FlatGen<T, D>, TReturn, TNext>;

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a generator that yields the individual values at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param depth
     */
    flatMap<D extends number = 1>(f: IndexedFn<T, FlatGen<T, D>, S>, depth?: D):
        Enhanced<S, FlatGen<T, D>, TReturn, TNext>;

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     */
    slice(start?: number, end?: number): Enhanced<T, S, TReturn | undefined, TNext>;

    /**
     * Concatenates generators (or iterators or iterables).
     *
     * Ensures that any supplied generators are terminated when this is terminated.
     * @param gens zero or more additional [[Genable]] to provide values.
     */

    concat<A>(...gens: Genable<A, S, void, void>[]):
        Enhanced<A, S, void, void>;

    /**
     * Like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array") is omitted
     * because there is no array.
     * @param f
     */
    reduce<A, T, TReturn, TNext>(f: Reducer<A, T, T, S>): ReturnValue<A, S>;
    /**
     * Like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array") is omitted
     * because there is no array.
     * @param f
     * @param init
     */
    reduce<A, T, TReturn = T, TNext = T>(f: Reducer<A, T, A, S>, init: A): ReturnValue<A, S>;
    reduce<A>(f: Reducer<A, T, A, S>, init?: A): ReturnValue<A, S>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    some<T>(p: IndexedPredicate<T, S>, thisArg?: any): ReturnValue<boolean, S>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    every(p: IndexedPredicate<T, S>, thisArg?: any): ReturnValue<boolean, S>;

    /**
     * Returns a new generator that repeats the last value returned by this (or `undefined` if this
     * did not return any values).
     *
     * @param max
     */
    repeatLast(max?: number): Enhanced<T, S, TReturn | void, TNext>;

    /**
     * Returns a new generator that repeats the supplied value after this generator
     * completes.
     *
     * @param value the value to repeat
     * @param repetitions The number repetitions; the default is infinite.
     */

    repeat<N>(value: N, repetitions?: number): Enhanced<T | N, S, void, void> ;

    /**
     * Trivial, but handy, same as **Array.prototype.join**.
     * @param sep (default = ',').
     *
     * See also {@link EnhancedGenerator.join}
     */
    join(sep?: string): ReturnValue<string, S>;

    /**
     * Sorts the supplied values and returns a sorted array.
     * @param cmp a comparison function
     */
    sort(cmp?: (a: T, b: T) => number): ReturnValue<T[], S>;
}
