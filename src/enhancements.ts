/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */
/**
 * This provides the trampoline methods that are shared between synchronous and
 * asynchronous enhanced generators. Methods dispatch to {@link Sync} or {@link Async}
 * as appropriate.
 *
 * This becomes part of the prototype chain of enhanced generator instances. It does
 * __not__ modify any global prototypes.
 *
 * You should not need to reference this directly. In Typescript, if you need a
 * type that covers both sync and async enhanced generators, use {@link Enhanced} (for,
 * generators) or the {@link GeneratorOps} interface (for the functional interface).
 *

 * @module Enhancements
 */

import type {
    Enhanced, FlatGen, Genable,
    GeneratorOps, IndexedFn, IndexedPredicate,
    Reducer, ReturnValue, SyncType
    } from "./types";

type async = 'async';

/**
 * Enhancements for generators
 */

export type {Enhanced} from './types';

/**
 * The trampoline methods that link enhanced generators to [[Sync]] or [[Async]]
 * methods.
 */
export abstract class Enhancements<
        T, TReturn, TNext, S extends SyncType
        >
{
    /**
     * @internal
     */
    abstract _impl: GeneratorOps<S>;

    /**
     * @internal
     */
    // Set on a call to return().
    returning?: any;

    /**
     * @internal
     */
    abstract next(...arg: [] | [arg: TNext]):
        S extends async
            ? Promise<IteratorResult<T, TReturn>>
            : IteratorResult<T, TReturn>;

    /**
     * @internal
     */
    abstract return(value: TReturn):
        S extends async
            ? Promise<IteratorReturnResult<TReturn>>
            : IteratorReturnResult<TReturn>;

    /**
     * @internal
     */
    abstract throw(e: any):
        S extends async
            ? Promise<IteratorReturnResult<TReturn>>
            : IteratorReturnResult<TReturn>;;

    /**
     * @internal
     */
    abstract [Symbol.iterator]:
        S extends async
            ? undefined
            : () => this & IterableIterator<T>;

    /**
     * @internal
     */
    abstract [Symbol.asyncIterator]:
        S extends async
            ? () => this & AsyncIterableIterator<T>
            : undefined;

    /**
     * @internal
     */
    abstract [Symbol.toStringTag]:
        S extends async
            ? 'EnhancedAsyncGenerator'
            : 'EnhancedGenerator';

    /**
     * Return all of the values from this generator as an array. You do not want to call this on an
     * infinite generator (for obvious reasons); consider using [[Enhancements.slice|Generator.slice]] or
     * [[Enhancements.limit|Generator.limit]] to limit the size before calling this.
     */
    asArray(): ReturnValue<T[], S> {
        return this._impl.asArray<T, TReturn, TNext>(this);
    }

    /**
     * Limit the number of values that can be generated. A `RangeError` is thrown if this limit is
     * exceeded. See [[IEnhacements.slice|Generator.slice]] if you want to truncate.
     * @param max
     */
    limit(max: number): Enhanced<T, S, TReturn, TNext> {
        return this._impl.limit(max, this);
    }

    /**
     * Operate on each value produced by this generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Value to be supplied as context `this` for function _f_.
     */
    forEach(f: IndexedFn<T, void, S>, thisArg?: any): void {
        this._impl.forEach<T, TReturn, TNext>(f, thisArg, this);
    }

    /**
     * Apply the function to each value yielded by this generator. It is called with two arguments,
     * the value yielded, and a sequential index. The return value is a generator that yields the
     * values produced by the function.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     */
    map<V>(f: IndexedFn<T, V, S>, thisArg?: any): Enhanced<V, S, TReturn, TNext> {
        return this._impl.map(f, thisArg, this);
    }


    /**
     * Return a new enhanced [[Enhancements|Generator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     */
    filter(f: IndexedPredicate<T, S>, thisArg?: any): Enhanced<T, S, TReturn, TNext> {
        return this._impl.filter(f, thisArg, this);
    }

    /**
     * Flatten the values yielded by this generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth (default = 1)
     */
    flat<D extends number>(depth: D = 1 as D): Enhanced<S, FlatGen<T, D>, TReturn, TNext> {
        return this._impl.flat<D, T, TReturn, TNext>(depth, this);
    }

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a generator that yields the individual values at each level in depth-first order. Any iterable
     * (including `Array`) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param depth
     */
    flatMap<D extends number = 1>(f: IndexedFn<T, FlatGen<T, D>, S>, depth: D = 1 as D):
        Enhanced<S, FlatGen<T, D>, TReturn, TNext>
    {
        return this._impl.flatMap<D, T, FlatGen<T, D>, TReturn, TNext>(f, depth, this);
    }

    /**
     * Return a new enhanced [[Enhancements|Generator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     */
    slice(start: number = 0, end: number = Number.POSITIVE_INFINITY): Enhanced<T, S, TReturn | undefined, TNext> {
        return this._impl.slice(start, end, this);
    }

    /**
     * Concatenates generators (or iterators or iterables).
     *
     * Ensures that any supplied generators are terminated when this is terminated.
     * @param gens zero or more additional [[Genable]] to provide values.
     */

    concat<A>(...gens: Genable<A, S, void, void>[])
    {
        return this._impl.concat<A>(this as Genable<A, S, void, void>, ...gens);
    }


    /**
     * Like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array") is omitted
     * because there is no array.
     * @param f
     */
    reduce<A>(f: Reducer<A, T, T, S>): ReturnValue<A, S>;
    /**
     * Like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array") is omitted
     * because there is no array.
     * @param f
     * @param init
     */
    reduce<A>(f: Reducer<A, T, A, S>, init: A): ReturnValue<A, S>;
    reduce<A>(f: Reducer<A, T, A, S>, init?: A): ReturnValue<A, S> {
        return this._impl.reduce<A, T, TReturn, TNext>(f, init as A, this);
    }

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    some(p: IndexedPredicate<T, S>, thisArg?: any): ReturnValue<boolean, S> {
        return this._impl.some(p, thisArg, this);
    }

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    every(p: IndexedPredicate<T, S>, thisArg?: any): ReturnValue<boolean, S> {
        return this._impl.every(p, thisArg, this as Genable<T, S, TReturn, TNext>);
    }


    /**
     * Returns a new generator that repeats the last value returned by this (or `undefined` if this
     * did not return any values).
     *
     * @param max
     */
    repeatLast(max: number = Number.POSITIVE_INFINITY): Enhanced<T, S, TReturn | void, TNext> {
        return this._impl.repeatLast(this, max);
    }


    /**
     * Returns a new generator that repeats the supplied value after this generator
     * completes.
     *
     * @param value the value to repeat
     * @param repetitions The number repetitions; the default is infinite.
     */

    repeat<N>(value: N, repetitions: number = Number.POSITIVE_INFINITY): Enhanced<T | N, S, void, void> {
        const tail = this._impl.repeat<T|N, void, void>(value, repetitions);
        const result = this._impl.concat(
            this as Genable<T|N, S, undefined, void>,
            tail as Genable<T|N, S, undefined, void>
        );
        return result as Enhanced<T | N, S, undefined, void>;
    }

    /**
     * Combines this generator with additional ones, returning a generator that produces a tuple with
     * each of their results, with this generator's result first.
     *
     * Terminates when any generator terminates. To get other behaviors, use with {@link IEnhancements.repeat | EnhancedGenerator.repeat}
     * or {@link IEnhancements.repeatLast | EnhancedGenerator.repeatLast}.
     * @param gens
     */

    zip<G extends (Genable<T, S, TReturn, TNext>)[], T, TReturn, TNext>(...gens: G):
        Enhanced<Array<T>, S, TReturn, TNext>
    {
        return this._impl.zip(this as Genable<T, S, TReturn, TNext>, ...gens) as
            Enhanced<Array<T>, S, TReturn, TNext>;
    }

    /**
     * Trivial, but handy, same as `Array.prototype.join`.
     * @param sep (default = ',').
     *
     * See also {@link EnhancedGenerator.join}
     */
    join(sep?: string): ReturnValue<string, S> {
        return this._impl.join(this, sep);
    }

    /**
     * Sorts the supplied values and returns a sorted array.
     * @param cmp a comparison function
     */
    sort(cmp?: (a: T, b: T) => number): ReturnValue<T[], S> {
        return this._impl.sort(cmp)(this as Genable<T, S, TReturn, TNext>);
    }
}
