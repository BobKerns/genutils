/**
 * @module genutils
 * Copyright 2020 by Bob Kerns. Licensed under MIT license
 */

/**
 * This provides the trampoline methods that are shared between synchronous and
 * asynchronous enhanced generators. Methods dispatch to [[Sync]] or [[Async]]
 * as appropriate.
 *
 * This becomes part of the prototype chain of enhanced generator instances. It does
 * __not__ modify any global prototypes.
 *
 * You should not need to reference this directly. In Typescript, if you need to a
 * type that covers both sync and async enhanced generators, use [[Enhanced]],
 * or the [[GeneratorOps]] interface.
 *
 * @packageDocumentation
 * @module enhancements
 * @preferred
 */

import {Enhanced, FlatGen, Genable, GeneratorOps, GenIteratorResult, GenUnion, IndexedFn, IndexedPredicate, Reducer, ReturnValue, SyncType, UnwrapGen} from "./types";

/**
 * Enhancements for generators
 */

export type {Enhanced} from './types';

/**
 * The trampoline methods that link enhanced generators to [[Sync]] or [[Async]]
 * methods.
 */
export abstract class Enhancements<T, TReturn, TNext, S extends SyncType> {

    abstract _impl: GeneratorOps<S>;

    // Set on a call to return().
    returning?: any;

    abstract next(): GenIteratorResult<T, TReturn, S>;

    abstract return(value: any): GenIteratorResult<T, TReturn, S>;

    abstract throw(e: any): GenIteratorResult<T, TReturn, S>;


    /**
     * Return all of the values from this generator as an array. You do not want to call this on an
     * infinite generator (for obvious reasons); consider using [[EnhancedGenerator.slice]] or
     * [[EnhancedGenerator.limit]] to limit the size before calling this.
     */
    asArray(): ReturnValue<T[], S> {
        return this._impl.asArray(this);
    }

    /**
     * Limit the number of values that can be generated. A `RangeError` is thrown if this limit is
     * exceeded. See [[EnhancedGenerator.slice]] if you want to truncate.
     * @param max
     */
    limit(max: number): Enhanced<T, S> {
        return this._impl.limit(max, this);
    }

    /**
     * Operate on each value produced by this generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Value to be supplied as context `this` for function _f_.
     */
    forEach(f: IndexedFn<T, void, S>, thisArg?: any): void {
        this._impl.forEach(f, thisArg, this);
    }

    /**
     * Apply the function to each value yielded by this generator. It is called with two arguments,
     * the value yielded, and a sequential index. The return value is a generator that yields the
     * values produced by the function.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     */
    map<V>(f: IndexedFn<T, V, S>, thisArg?: any): Enhanced<V, S> {
        return this._impl.map(f, thisArg, this);
    }


    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     */
    filter(f: IndexedPredicate<T, S>, thisArg?: any): Enhanced<T, S> {
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
    flat<D extends number = 1>(depth: D = 1 as D): Enhanced<S, FlatGen<T, D>> {
        return this._impl.flat<T, D>(depth, this);
    }

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a generator that yields the individual values at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param depth
     */
    flatMap<D extends number = 1>(f: IndexedFn<T, FlatGen<T, D>, S>, depth: D = 1 as D): Enhanced<S, FlatGen<T, D>> {
        return this._impl.flatMap<T, D>(f, depth, this);
    }

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     */
    slice(start: number = 0, end: number = Number.POSITIVE_INFINITY): Enhanced<T, S> {
        return this._impl.slice(start, end, this);
    }

    /**
     * Concatenates generators (or iterators or iterables).
     *
     * Ensures that any supplied generators are terminated when this is terminated.
     * @param gens zero or more additional [[Genable]] to provide values.
     */

    concat<X extends Genable<any, S>[]>(...gens: X): Enhanced<GenUnion<X>|T, S> {
        return this._impl.concat(this, ...gens);
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
    reduce<A>(f: Reducer<A, T, S>, init?: A): ReturnValue<A, S> {
        return this._impl.reduce(f, init as A, this);
    }

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    some<T>(p: IndexedPredicate<T, S>, thisArg?: any): ReturnValue<boolean, S> {
        // Why is type typecast to Genable needed here?
        // Yet the seemingly identical case of 'every' below does not?
        return this._impl.some(p, thisArg, this as Genable<T, S>);
    }

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    every(p: IndexedPredicate<T>, thisArg?: any): ReturnValue<boolean, S> {
        return this._impl.every(p, thisArg, this);
    }


    /**
     * Returns a new generator that repeats the last value returned by this (or `undefined` if this
     * did not return any values).
     *
     * @param max
     */
    repeatLast(max: number = Number.POSITIVE_INFINITY): Enhanced<T | undefined, S> {
        return this._impl.repeatLast(this, max);
    }


    /**
     * Returns a new generator that repeats the supplied value after this generator
     * completes.
     *
     * @param value the value to repeat
     * @param repetitions The number repetitions; the default is infinite.
     */
    repeat<N>(value: N, repetitions: number = Number.POSITIVE_INFINITY): Enhanced<T | N, S> {
        return this.concat(this._impl.repeat(value, repetitions));
    }

    /**
     * Combines this generator with additional ones, returning a generator that produces a tuple with
     * each of their results, with this generator's result first.
     *
     * Terminates when any generator terminates. To get other behaviors, use with [[EnhancedGenerator.repeat]] or
     * [[EnhancedGenerator.repeatLast]].
     * @param gens
     */
    zip<G extends Genable<any, S>[]>(...gens: G): Enhanced<T | UnwrapGen<S, G>, S> {
        return this._impl.zip(this, ...gens) as Enhanced<T | UnwrapGen<S, G>, S>;
    }

    /**
     * Trivial, but handy, same as **Array.prototype.join**.
     * @param sep (default = ',').
     *
     * See also [[EnhancedGenerator.join]]
     */
    join(sep?: string): ReturnValue<string, S> {
        return this._impl.join(this, sep);
    }
}
