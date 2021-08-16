/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */
/**
 * Type declarations for generators and related.
 */

import {Enhancements} from "./enhancements";
import type {EnhancedGenerator} from "./sync-impl";
import type {EnhancedAsyncGenerator} from "./async-impl";
import { IEnhancements } from "./ienhancement";

/**
 * Like `Iterable<T>` except allows specifying `TReturn` and `TNext`.
 *
 * Unlike `Iterable<T>`, `TReturn` and `TNext` default to `T`, rather than
 * `any` and `undefined`, respectively.
 */
export type FullIterable<T, S extends SyncType, TReturn, TNext> = {
    sync: Iterable<T> & {
        [Symbol.iterator]: () => Iterator<T, TReturn, TNext>
    },
    async: AsyncIterable<T> & {
        [Symbol.asyncIterator]: () => AsyncIterator<T, TReturn, TNext>
    }
}[S];

/**
 * Like `IterableIterator<T>` except allows specifying `TReturn` and `TNext`.
 *
 * Unlike `IterableIterator<T>`, `TReturn` and `TNext` default to `T`, rather than
 * `any` and `undefined`, respectively.
 */
export type FullIterableIterator<T, S extends SyncType, TReturn, TNext> = {
    sync: IterableIterator<T> & {
        [Symbol.iterator]: () => FullIterableIterator<T, S, TReturn, TNext>;
    },
    async: AsyncIterable<T> & {
        [Symbol.asyncIterator]: () => FullIterableIterator<T, S, TReturn, TNext>
    }
}[S];

/**
 * Selector type to select the types for synchronous generators.
 * @deprecated Use {@link Sync.type}
 */
export type Sync = 'sync';
/**
 * Selector type to select the types for asynchronous generators.
 * @deprecated Use {@link Async.type}
 */
export type Async = 'async';

/**
 * Selector type to select the types for synchronous or asynchronous generators.
 * Reference the members as {@link Sync.type} or {@link Async.type}
 */
export type SyncType = Sync | Async;


/*
// Exceeds tsc's stack. I can't see how it differs from ArrayGen?
export type FlatGen<Arr, Depth extends number> = {
    "done": Arr,
    "recur": Arr extends Genable<infer InnerArr>
        ? FlatGen<InnerArr, [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20][Depth]>
        : Arr
}[Depth extends -1 ? "done" : "recur"];
*/
/**
 * @internal
 */
export type FlatGen<A, D> = any;

/**
 * Returns the union of the element types of a tuple of generators.
 * @typeParam Arr a tuple type of Genable's.
 */
export type GenUnion<Arr> =
    Arr extends []
        ? Arr
        : Arr extends Array<infer E>
            ? E extends Genable<infer E2, infer S, infer EReturn, infer ENext>
                ? E2
            : never
        : never;

// noinspection JSUnusedGlobalSymbols
/**
 * Returns the element type of a [[Genable]]
 * @typeParam T the value type produced by the [[Genable]]
 */
export type GenType<G, S extends SyncType> =
    G extends Genable<infer T, S, infer TReturn, infer TNext>
        ? T
        : never;

/**
 * Any `Generator`, `Iterator`, or `Iterable`, which can be coerced to a
 * [[EnhancedGenerator]].
 *
 * @typeParam T the value type produced by the [[Genable]]
 */
export type Genable<T, S extends SyncType, TReturn, TNext> =
    {
        sync: Generator<T, TReturn, TNext> | Iterator<T, TReturn, TNext>
            | Iterable<T>
            | Enhancements<T, TReturn, TNext, S>;
        async: AsyncGenerator<T, TReturn, TNext> | AsyncIterator<T, TReturn, TNext>
            | AsyncIterable<T>
            | Enhancements<T, TReturn, TNext, S>
            | Genable<T, Sync, TReturn, TNext>;
    }[S];

/**
 * A `Promise`, unless already promisified.
 */
export type GenPromise<T> = globalThis.Promise<T extends PromiseLike<infer X> ? X : T>;

/**
 * A value in the [[Sync]] case, or a promise of a value in the [[Async]] case.
 */
export type ReturnValue<T, S extends SyncType> = {
    sync: T;
    async: GenPromise<T>;
}[S];

type PromiseType<T> =
    T extends PromiseLike<infer R>
        ? R
        : T;

/**
 * A value, or in the [[Async]] case, optionally a `Promise<T>` of the value.
 */
type Value<T, S extends SyncType> =
    ReturnValue<T, S>
    | PromiseType<T>;

/**
 * A function which can be supplied to a reduce method.
 *
 * For the case where an init value of type A will be supplied, use:
 * * [[Reducer|Reducer\\<A, T, A>]]
 *
 * For the case where no init value will be supplied, use:
 * * [[Reducer|Reducer\\<A, T, T>]]
 *
 * For cases where an init value may or may not be supplied:
 * * [[Reducer|Reducer\\<A, T>]] (equivalent to [[Reducer|Reducer\<T, A, A|T>]]).
 *
 * For cases where **A** = **T** (for example, reducing a set of numbers to a number):
 * * [[Reducer|Reducer\\<A>]]
 *
 * @typeParam A The accumulated result.
 * @typeParam T The individual element values supplied to be reduced.
 * @typeParam Init the initial value for the reducer. If no init value is supplied, the first call will be **T**; otherwise it will be **A**.
 * @typeParam S either Sync or Async.
 */
export type Reducer<A, T, Init extends A | T, S extends SyncType> = {
    sync: (acc: Init | A, v: T) => A;
    async: (acc: Init | A, v: T) => A | PromiseLike<A>;
}[S];

/**
 * A predicate which can be applied to elements of an iteration.
 * @param v the element
 * @param idx the sequential index
 * @typeParam T the type of the elements.
 * @typeParam R the return type.
 */
export type IndexedFn<T, R, S extends SyncType> =
    {
        sync: (v: T, idx: number) => R;
        async: (v: T, idx: number) => PromiseLike<R> | R;
    }[S];

/**
 * A predicate which can be applied to elements of an iteration.
 * @param v the element
 * @param idx the sequential index
 * @typeParam T the type of the elements.
 */
export type IndexedPredicate<T, S extends SyncType> = IndexedFn<T, boolean, S>;

export type UnwrapGenTypeArray<S extends SyncType, B> =
    {
        [K in (keyof B) & number]:
            B[K] extends Genable<infer T, S, infer NR, infer N>
                ? PromiseType<T>
                : never;
    };

/**
 * Unwrap an array of Genables
 * @typeParam B the type to be unwrapped.
 * @internal
 */
export type UnwrapGenType<S extends SyncType, B> =
    UnwrapGenTypeArray<S, B>[keyof B & number];

export interface GeneratorOps<S extends SyncType> {
    /**
     * Return a generator that provides the supplied values.
     * @param values
     */
    of<T extends any[], TReturn, TNext>(...values: T):
        Enhanced<UnwrapArray<T>, S, TReturn, TNext>;

    asArray<T, TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>):
        ReturnValue<T[], S>;

    /**
     * Limit the number of values that can be generated. A `RangeError` is thrown if this limit is
     * exceeded. See [[EnhancedGenerator.slice]] if you want to truncate.
     * @param max
     * @param gen
     */
    limit<T, TReturn, TNext>(max: number, gen: Genable<T, S, TReturn, TNext>):
        Enhanced<T, S, TReturn, TNext>;

    /**
     * Limit the number of values that can be generated. A `RangeError` is thrown if this limit is
     * exceeded. See [[EnhancedGenerator.slice]] if you want to truncate.
     * @param max
     */
    limit(max: number):
        GenOp<S>;

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     * @param gen the generator.
     * @typeParam T the type of value produced by the generator.
     * @typeParam TReturn the type accepted by the `Iterator.return()` method.
     * @typeParam TNext the type accepted by the `Iterator.next()` method.
     */
    forEach<T, TReturn, TNext>(f: IndexedFn<T, void, S>, thisArg: any, gen: Genable<T, S, TReturn, TNext>):
        GenVoid<S>;

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param gen the generator.
     * @typeParam T the type of value produced by the generator.
     * @typeParam TReturn the type accepted by the `Iterator.return()` method.
     * @typeParam TNext the type accepted by the `Iterator.next()` method.
     */
    forEach<T, TReturn, TNext>(f: IndexedFn<T, void, S>, gen: Genable<T, S, TReturn, TNext>):
        GenVoid<S>;

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     * @typeParam T the type of value produced by the generator.
     * @typeParam TReturn the type accepted by the `Iterator.return()` method.
     * @typeParam TNext the type accepted by the `Iterator.next()` method.
     */
    forEach<T>(f: IndexedFn<T, void, S>, thisArg?: any):
        <XReturn, XNext>(gen: Genable<T, S, XReturn, XNext>) => GenVoid<S>;

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @typeParam T the type of value produced by the generator.
     * @typeParam TReturn the type accepted by the `Iterator.return()` method.
     * @typeParam TNext the type accepted by the `Iterator.next()` method.
     */
    forEach<T>(f: IndexedFn<T, void, S>):
        <XReturn, XNext>(gen: Genable<T, S, XReturn, XNext>, thisArg?: any) =>
            GenVoid<S>;

    /**
     * Accepts a function from `T` to `V, and returns a function that adapts a `Generator<T>`
     * (or any [Genable|Genable\\<T>]) to an enhanced `Generator<V>`. Each yielded value V is
     * the result of applying the function `f` to to a value yielded by the `Generator<T>`.
     *
     * In the async case, `f` may also return `Promise<T>`.
     *
     * @param f a function from `V` to `T`
     * @typeParam T the type of value yielded by the supplied generator.
     * @typeParam V the type of value yielded by the resulting generator.
     */
    map<T, V>(f: IndexedFn<T, V, S>):
        GenOpValue<S, T, V>;

    /**
     * Accepts a function from `T` to `V, and returns a function that adapts a `Generator<T>`
     * (or any [Genable|Genable\\<T>]) to an enhanced `Generator<V>`. Each yielded value V is
     * the result of applying the function `f` to to a value yielded by the `Generator<T>`.
     *
     * In the async case, `f` may also return `Promise<T>`.
     *
     * @param f
     * @param thisArg supplied as 'this' for each invocation of `f`.
     * @typeParam T the type of value produced by the generator.
     * @typeParam V the type of value yielded by the resulting generator.
     */
    map<T, V>(f: IndexedFn<T, V, S>, thisArg?: any):
        GenOpValue<S, T, V>;

    /**
     * Accepts a function from `T` to `V, and a `Generator<T>`
     * (or any [Genable|Genable\\<T>]) and returns an enhanced `Generator<V>`.
     *
     * Each yielded value V is
     * the result of applying the function `f` to to a value yielded by the `Generator<T>`.
     *
     * In the async case, `f` may also return `Promise<T>`.
     *
     * @param f
     * @param gen the [[Genable]] whose yielded values we are mapping over.
     * @typeParam T the type of value produced by the generator.
     * @typeParam V the type of value yielded by the resulting generator.
     */
    map<T, V, TReturn, TNext>(f: IndexedFn<T, V, S>, gen: Genable<T, S, TReturn, TNext>):
        Enhanced<V, S, TReturn, TNext>;

    /**
     * Accepts a function from `T` to `V, and a `Generator<T>`
     * (or any [Genable|Genable\\<T>]) and returns an enhanced `Generator<V>`.
     *
     * Each yielded value V is
     * the result of applying the function `f` to to a value yielded by the `Generator<T>`.
     *
     * In the async case, `f` may also return `Promise<T>`.
     *
     * @param f
     * @param thisArg supplied as 'this' for each invocation of `f`.
     * @param gen the [[Genable]] whose yielded values we are mapping over.
     * @typeParam T the type of value produced by the generator.
     * @typeParam V the type of value yielded by the resulting generator.
     */
    map<T, V, TReturn, TNext>(f: IndexedFn<T, V, S>, thisArg: any, gen: Genable<T, S, TReturn, TNext>):
        Enhanced<V, S, TReturn, TNext>;

    /**
     * Return a functionthat filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, S>):
        GenOpValue<S, T, T>;


    /**
     * Return a functionthat filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, S>, thisArg: any):
        GenOpValue<S, T, T>;

    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T, TReturn, TNext>(f: IndexedPredicate<T, S>, iter: Genable<T, S, TReturn, TNext>):
        Enhanced<T, S, TReturn, TNext>;

    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T, TReturn, TNext>(f: IndexedPredicate<T, S>, thisArg: any, iter: Genable<T, S, TReturn, TNext>):
        Enhanced<T, S, TReturn, TNext>;

    filter<T, TReturn, TNext>(f: IndexedPredicate<T, S>, thisArg?: any, iter?: Genable<T, S, TReturn, TNext>):
        Enhanced<T, S, TReturn, TNext>;


    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     */
    flat<D extends number>(depth: D):
        <T, TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>) => Enhanced<FlatGen<T, D>, S, TReturn, TNext>;

    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     * @param gen
     */
    flat<D extends number, T, TReturn, TNext>(depth: D, gen: Genable<T, S, TReturn, TNext>):
        Enhanced<FlatGen<T, D>, S, TReturn, TNext>;

    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param gen
     * @param depth default = 1
     */
    flat<D extends number, T, TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>, depth?: D):
        Enhanced<FlatGen<T, D>, S, TReturn, TNext>;

    flat<D extends number, T, TReturn, TNext>(depth: D | Genable<T, S, TReturn, TNext>, gen?: Genable<T, S, TReturn, TNext> | D):
        Enhanced<FlatGen<T, D>, S, TReturn, TNext>
        | (
            <X, XReturn = X, XNext = X>(gen: Genable<X, S, XReturn, XNext>) =>
                Enhanced<FlatGen<X, D>, S, XReturn, XNext>
        )
        | (
            <X, XReturn = X, XNext = X>(gen: Genable<X, S, XReturn, XNext>, thisObj: any) =>
                Enhanced<FlatGen<X, D>, S, XReturn, XNext>
        );


    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a function that accepts a generator, and returns another generator that yields the individual value
     * at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param depth
     */
    flatMap<D extends number, R extends FlatGen<T, D>, T>(f: IndexedFn<T, R, S>, depth: D):
        <TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>) =>
            Enhanced<R, S, TReturn, TNext>;

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a function that accepts a generator, and returns another generator that yields the individual value
     * at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     */
    flatMap<D extends number, R extends FlatGen<T, D>, T>(f: IndexedFn<T, R, S>):
        <TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>, depth?: D) =>
            Enhanced<R, S, TReturn, TNext>;

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a generator that yields the individual values at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param gen
     */
    flatMap<D extends number, R extends FlatGen<T, D>, T, TReturn, TNext>(f: IndexedFn<T, R, S>, gen: Genable<T, S, TReturn, TNext>):
        Enhanced<R, S, TReturn, TNext>;

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a generator that yields the individual values at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param depth
     * @param gen
     */
    flatMap<D extends number, R extends FlatGen<T, D>, T, TReturn, TNext>(f: IndexedFn<T, R, S>, depth: D, gen: Genable<T, S, TReturn, TNext>):
        Enhanced<FlatGen<R, D>, S, TReturn, TNext>;

    flatMap<D extends number, R extends FlatGen<T, D>, T, TReturn, TNext>(
            f: IndexedFn<T, R, S>,
            depthOrGen?: D | Genable<T, S, TReturn, TNext>,
            gen?: Genable<T, S, TReturn, TNext>
        ):
        Enhanced<FlatGen<R, D>, S, TReturn, TNext>
        | (<X, Y extends FlatGen<T, D>, XReturn , XNext>(gen: Genable<X, S, XReturn, XNext>) => Enhanced<Y, S, XReturn, XNext>)
        | (<X, Y extends FlatGen<T, D>, XReturn, XNext>(gen: Genable<X, S, XReturn, XNext>, depth?: D) => Enhanced<Y, S, XReturn, XNext>);

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     */
    slice(start: number, end: number):
        <X, XReturn, XNext>(iter: Genable<X, S, XReturn, XNext>) =>
            Enhanced<X, S, XReturn | undefined, XNext>;

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     * @param iter
     */
    slice<T, TReturn, TNext>(start: number, end: number, iter: Genable<T, S, TReturn, TNext>):
        Enhanced<T, S, TReturn | undefined, TNext>;

    slice<T, TReturn, TNext>(start: number, end: number, iter?: Genable<T, S, TReturn, TNext>):
        Enhanced<T, S, TReturn | undefined, TNext>
        | (
            <X, XReturn, XNext>(gen: Genable<X, S, XReturn | undefined, XNext>) =>
            Enhanced<X, S, XReturn | undefined, XNext>
            );

    /**
     * Concatenates generators (or iterators or iterables).
     *
     * Ensures that any supplied generators are terminated when this is terminated.
     * @param gens zero or more additional [[Genable]] to provide values.
     */
    concat<T, TReturn, TNext>(...gens: Array<Genable<T, S, TReturn, TNext>>):
        Enhanced<T, S, TReturn | void, TNext>;


    /**
     * Reduces **gen** like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     * @param f
     * @param gen
     */
    reduce<A, T, TReturn, TNext>(f: Reducer<A, T, T, S>, gen: Genable<T, S, TReturn, TNext>): ReturnValue<A, S>;

    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * **Array.prototype.reduce**. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T, TReturn, TNext>(f: Reducer<A, T, T, S>): (gen: Genable<T, S, TReturn, TNext>) => ReturnValue<A, S>;

    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T>(f: Reducer<A, T, A, S>):
        <TReturn, TNext>(init: A, gen: Genable<T, S, TReturn, TNext>)
            => ReturnValue<A, S>;

    /**
     * Reduces **gen** like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     * @param f
     * @param init
     * @param gen
     */
    reduce<A, T, TReturn, TNext>(f: Reducer<A, T, A, S>, init: A, gen: Genable<T, S, TReturn, TNext>):
        ReturnValue<A, S>;

    /**
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * Alternatively, the init value can be supplied along with the generator as a second argument.
     * @param f
     * @param init
     */
    reduce<A, T>(f: Reducer<A, T, A, S>, init: A):
        <TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>) =>
            ReturnValue<A, S>;

    reduce<A, T, TReturn, TNext>(
        f: Reducer<A, T, A | T, S>,
        initOrGen?: Value<A, S> | Genable<T, S, TReturn, TNext>,
        gen?: Genable<T, S, TReturn, TNext>
    ): Value<A, S>
        | (<XReturn = T, XNext = T>(gen: Genable<T, S, XReturn, XNext>) => Value<A, S>)
        | ((f: (acc: A, v: T) => Value<A, S>, init: A) => Value<A, S>)
        | ((f: (acc: A | T, v: T) => Value<A, S>) => Value<A, S>);


    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    some<T>(p: IndexedPredicate<T, S>, thisArg?: any):
        <TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>) => ReturnValue<boolean, S>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     */
    some<T>(p: IndexedPredicate<T, S>):
        <TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>, thisArg?: any)
            => ReturnValue<boolean, S>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    some<T, TReturn, TNext>(p: IndexedPredicate<T, S>, gen: Genable<T, S, TReturn, TNext>):
        ReturnValue<boolean, S>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    some<T, TReturn, TNext>(p: IndexedPredicate<T, S>, thisArg: any, gen: Genable<T, S, TReturn, TNext>):
        ReturnValue<boolean, S>;

    some<T, TReturn = T, TNext = T>(
        pred: IndexedPredicate<T, S>,
        thisOrGen?: any | Genable<T, S, TReturn, TNext>,
        gen?: Genable<T, S, TReturn, TNext>
    ):
        ReturnValue<boolean, S>
        | (<XReturn, XNext>(gen: Genable<T, S, XReturn, XNext>) => ReturnValue<boolean, S>);

    /**
     * Returns `false` and terminates the generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    every<T>(p: IndexedPredicate<T, S>, thisArg?: any):
        <TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>) =>
            ReturnValue<boolean, S>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     */
    every<T>(p: IndexedPredicate<T, S>):
        <TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>, thisArg?: any) =>
            ReturnValue<boolean, S>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    every<T, TReturn, TNext>(p: IndexedPredicate<T, S>, gen: Genable<T, S, TReturn, TNext>):
        ReturnValue<boolean, S>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    every<T, TReturn, TNext>(p: IndexedPredicate<T, S>, thisArg: any, gen: Genable<T, S, TReturn, TNext>):
        ReturnValue<boolean, S>;

    every<T, TReturn, TNext>(
        pred: IndexedPredicate<T, S>,
        genOrThis?: any | Genable<T, S, TReturn, TNext>,
        gen?: Genable<T, S, TReturn, TNext>
    ):
        ReturnValue<boolean, S>
        | (<XReturn = T, XNext = T>(gen: Genable<T, S, XReturn, XNext>) => ReturnValue<boolean, S>);

    /**
     * Returns a new generator that repeatedly yields the last value returned by **gen** (or returns `undefined` if **gen**
     * did not return any values).
     *
     * @param gen
     * @param max
     */
    repeatLast<T, TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>, max: number):
        Enhanced<T, S, TReturn | void, TNext>;


    /**
     * Returns a new generator that repeats the supplied value.
     *
     * @param value the value to repeat
     * @param repetitions The number repetitions; the default is infinite.
     */
    repeat<T, TReturn, TNext>(value: T, repetitions: number):
        Enhanced<T, S, TReturn | void, TNext>;

    /**
     * Combines generators, returning a generator that produces a tuple with each of their results.
     *
     * Terminates when the first generator terminates. To get other behaviors, use with [[EnhancedGenerator.repeat]] or
     * [[EnhancedGenerator.repeatLast]].
     * @param gens
     */
    zip<T, TReturn, TNext>(...gens: Array<Genable<T, S, TReturn, TNext>>):
        Enhanced<Array<T>, S, TReturn, TNext>;

    /**
     * Returns a function that joins the elements produced by a [[Genable]], analogous to `Array.prototype.join`.
     * @param sep (default = ',')
     */
    join(sep: string):
        <T, TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>) =>
            ReturnValue<string, S>;

    /**
     * Joins the elements produced by a [[Genable]], analogous to `Array.prototype.join`.
     * @param gen
     * @param sep
     */
    join<T, TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>, sep?: string):
        ReturnValue<string, S>;

    join<T, TReturn, TNext>(genOrSeparator: Genable<T, S, TReturn, TNext>|string, sep?: string):
        ReturnValue<string, S> | (<X>(gen: Genable<X, S, TReturn, TNext>) =>
            ReturnValue<string, S>);

    /**
     * Returns a new generator that returns values from each of the supplied sources as they are available.
     * For [[Sync]] generators, these will be taken in round-robin fashion from each non-terminated
     * generator, until all have terminated. For [[Async]] generators, they will be taken as they become
     * available. The yielded values will not be distinguished by which which source they are taken; for
     * that, another method will be supplied.
     *
     * Any calls to `Generator.throw()` or `Generator.return()` will be passed to all non-terminated
     * sources.
     * @param sources
     */
    merge<T, TReturn, TNext>(...sources: Array<Genable<T, S, TReturn, TNext>>):
        Enhanced<T, S, TReturn | void, TNext>;

    /**
     * Returns a function that sorts the supplied sources and returns a sorted array.
     * @param cmp a comparison function
     */
    sort<T>(cmp?: (a: T, b: T) => number):
        <XReturn, XNext>(...sources: Array<Genable<T, S, XReturn, XNext>>) =>
            ReturnValue<T[], S>;

    /**
     * Enhance a `Generator` with our enhanced methods.
     * @param gen
     */
    enhance<T, TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>):
        Enhanced<T, S, TReturn, TNext>;
}

/**
 * An enhanced `Generator`
 * @typeParam T The value type yielded by the `Generator`.
 * @typeParam S Selects for Sync or Async operation.
 */
export type Enhanced<T, S extends SyncType, TReturn, TNext> = {
    sync: EnhancedGenerator<T, TReturn, TNext>;
    async: EnhancedAsyncGenerator<T, TReturn, TNext>;
}[S];

/**
 * An operator that takes a [[Genable]], optionals, and returns an [[Enhanced]]
 * with a free type parameter T for the element type of the [[Genable]].
 *
 * This is used for signatures that take some parameters
 * and return a function that is not constrained as to element type.
 * @typeParam S Selects for Sync or Async operation
 * @typeParam Optional An array of types with any additional arguments after the [[Genable]]
 */
export type GenOp<S extends SyncType, Optional extends any[] = []> =
    <T, TReturn, TNext>(gen: Genable<T, S, TReturn, TNext>, ...rest: Optional) =>
        Enhanced<T, S, TReturn, TNext>;

/**
 * An operator that takes a [[Genable]], optionals, and returns a relate type,
 * often an [[Enhanced]].
 * @typeParam S Selects for Sync or Async operation
 * @typeParam T the element type of the [[Genable]]
 * @typeParam Optional an array of types with any additional arguments after the [[Genable]]
 * @typeParam R the return type; defaults to [[Enhanced|Enhanced\\<T, S>]].
 */
export type GenOpValue<S extends SyncType, T, V, Optional extends any[] = []> =
    <TReturn, TNext>
        (gen: Genable<T, S, TReturn, TNext>, ...rest: Optional) =>
            Enhanced<V, S, TReturn, TNext>;

export type GenIteratorReturnResult<TReturn, S extends SyncType> =
    {
        sync: IteratorReturnResult<TReturn>;
        async: Promise<IteratorReturnResult<TReturn>>;
    }[S];

export type GenIteratorYieldResult<T, S extends SyncType> =
    {
        sync: IteratorYieldResult<T>;
        async: Promise<IteratorYieldResult<T>>;
    }[S];

export type GenIteratorResult<T, TReturn, S extends SyncType> =
    GenIteratorYieldResult<T, S>
    | GenIteratorReturnResult<TReturn, S>;

export type GenVoid<S extends SyncType> = {
    sync: void;
    async: Promise<void>;
}[S];

export type UnwrapArray<T> = T extends Array<infer E> ? E : never;


/**
 * @internal
 */
export type Constructor<T extends {}> = new (...args: any[]) => T;
/**
 * @internal
 */
export type ConstructorType<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer R ? R : never;
/**
 * Type produced by {@link Sync.Mixin}.
 */
export type SyncEnhancedConstructor<T, TReturn, TNext, Base extends Constructor<Iterable<T>>> = ConstructorType<Base> & IEnhancements<T, TReturn, TNext, 'sync'>;
/**
 * Type produced by {@link Async.Mixin}.
 */
export type AsyncEnhancedConstructor<T, TReturn, TNext, Base extends Constructor<AsyncIterable<T>>> = ConstructorType<Base> & IEnhancements<T, TReturn, TNext, 'async'>;
