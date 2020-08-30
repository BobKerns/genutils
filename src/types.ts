/**
 * @module genutils
 * Copyright 2020 by Bob Kerns. Licensed under MIT license
 */

/**
 * Type declarations for generators and related.
 *
 * @packageDocumentation
 * @module types
 * @preferred
 */

import type {Enhancements} from "./enhancements";
import type {EnhancedGenerator} from "./sync";
import type {EnhancedAsyncGenerator} from "./async";

/**
 * Selector type to select the types for synchronous generators.
 */
export type Sync = 'sync';
/**
 * Selector type to select the types for asynchronous generators.
 */
export type Async = 'async';

/**
 * Selector type to select the types for synchronous or asynchronous generators.
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
    Arr extends [] ? Arr : Arr extends Array<infer E> ? E extends Genable<infer E2> ? E2 : never : never;

// noinspection JSUnusedGlobalSymbols
/**
 * Returns the element type of a [[Genable]]
 * @typeParam T the value type produced by the [[Genable]]
 */
export type GenType<G, S extends SyncType> = G extends Genable<infer T, S> ? T : never;

/**
 * Any `Generator`, `Iterator`, or `Iterable`, which can be coerced to a
 * [[EnhancedGenerator]].
 *
 * @typeParam T the value type produced by the [[Genable]]
 */
export type Genable<T, S extends SyncType = Sync> =
    {
        sync: Generator<T> | Iterator<T> | Iterable<T> | Enhancements<T, any, unknown, S>;
        async: AsyncGenerator<T> | AsyncIterator<T> | AsyncIterable<T> | Enhancements<T, any, unknown, S> | Genable<T, Sync>;
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

type PromiseType<T> = T extends PromiseLike<infer R> ? R : T;

/**
 * A value, or in the [[Async]] case, optionally a `Promise<T>` of the value.
 */
type Value<T, S extends SyncType> = ReturnValue<T, S> | PromiseType<T>;

/**
 * Any `Generator`, `Iterator`, or `Iterable`, which can be coerced to a
 * [[EnhancedGenerator]].
 *
 * @typeParam T the value type produced by the [[Genable]]
 */
export type AsyncGenable<T> = Genable<T, Async>;

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
export type Reducer<A, T, Init = A | T, S extends SyncType = Sync> = {
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
export type IndexedFn<T, R = void, S extends SyncType = Sync> =
    {
        sync: (v: T, idx: number) => R;
        async: (v: T, idx: number) => PromiseLike<R> | R;
    }[S];

/**
 * A predicate which can be applied to elements of an iteration, possibly returning a `Promise`.
 * @param v the element
 * @param idx the sequential index
 * @typeParam T the type of the elements.
 * @typeParam R the return type.
 */
export type AsyncIndexedFn<T, R = void> = IndexedFn<T, R, Async>;

/**
 * A predicate which can be applied to elements of an iteration.
 * @param v the element
 * @param idx the sequential index
 * @typeParam T the type of the elements.
 */
export type IndexedPredicate<T, S extends SyncType = Sync> = IndexedFn<T, boolean, S>;

/**
 * Unwrap an array of Genables
 * @typeParam B the type to be unwrapped.
 * @internal
 */
export type UnwrapGen<S extends SyncType, B extends Array<Genable<any, S>>> = { [K in (keyof B) & number]: B[K] extends Genable<infer T, S> ? T : never; };

export interface GeneratorOps<S extends SyncType> {
    /**
     * Return a generator that provides the supplied values.
     * @param values
     */
    of<T extends any[]>(...values: T) : Enhanced<UnwrapArray<T>, S>;

    asArray<T>(gen: Genable<T, S>): ReturnValue<T[], S>;

    /**
     * Limit the number of values that can be generated. A `RangeError` is thrown if this limit is
     * exceeded. See [[EnhancedGenerator.slice]] if you want to truncate.
     * @param max
     * @param gen
     */
    limit<T>(max: number, gen: Genable<T, S>): Enhanced<T, S>;

    /**
     * Limit the number of values that can be generated. A `RangeError` is thrown if this limit is
     * exceeded. See [[EnhancedGenerator.slice]] if you want to truncate.
     * @param max
     */
    limit(max: number): GenOp<S>;


    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     * @param gen the generator.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T, void, S>, thisArg: any, gen: Genable<T, S>): GenVoid<S>;

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param gen the generator.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T, void, S>, gen: Genable<T, S>): GenVoid<S>;

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T, void, S>, thisArg?: any): (gen: Genable<T, S>) => GenVoid<S>;

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T, void, S>): (gen: Genable<T, S>, thisArg?: any) => GenVoid<S>;

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
    map<T, V>(f: IndexedFn<T, V, S>): GenOpValue<S, T, [any?], Enhanced<V, S>>;

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
    map<T, V>(f: IndexedFn<T, V, S>, thisArg?: any): GenOpValue<S, T, [], Enhanced<V, S>>;

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
    map<T, V>(f: IndexedFn<T, V, S>, gen: Genable<T, S>): Enhanced<V, S>;

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
    map<T, V>(f: IndexedFn<T, V, S>, thisArg: any, gen: Genable<T, S>): Enhanced<V, S>;


    /**
     * Return a functionthat filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, S>): GenOpValue<S, T, [any?], Enhanced<T, S>>;


    /**
     * Return a functionthat filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, S>, thisArg: any): GenOpValue<S, T, [], Enhanced<T, S>>;

    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, S>, iter: Genable<T, S>): Enhanced<T, S>;

    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, S>, thisArg: any, iter: Genable<T, S>): Enhanced<T, S>;

    filter<T>(f: IndexedPredicate<T, S>, thisArg?: any, iter?: Genable<T, S>): Enhanced<T, S>;


    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     */
    flat<T, D extends number = 1>(depth: D): <X>(gen: Genable<X, S>) => Enhanced<FlatGen<X, D>, S>;

    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     * @param gen
     */
    flat<T, D extends number = 1>(depth: D, gen: Genable<T, S>): Enhanced<FlatGen<T, D>, S>;

    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param gen
     * @param depth default = 1
     */
    flat<T, D extends number = 1>(gen: Genable<T, S>, depth?: D): Enhanced<FlatGen<T, D>, S>;

    flat<T, D extends number = 1>(depth: D | Genable<T, S>, gen?: Genable<T, S> | D):
        Enhanced<FlatGen<T, D>, S>
        | (<X>(gen: Genable<X, S>) => Enhanced<S, FlatGen<X, D>>)
        | (<X>(gen: Genable<X, S>, thisObj: any) => Enhanced<S, FlatGen<X, D>>);


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
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, S>, depth: D): (gen: Genable<T, S>) => Enhanced<FlatGen<R, D>, S>;

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a function that accepts a generator, and returns another generator that yields the individual value
     * at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     */
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, S>): (gen: Genable<T, S>, depth?: D) => Enhanced<FlatGen<R, D>, S>;

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a generator that yields the individual values at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param gen
     */
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, S>, gen: Genable<T, S>): Enhanced<FlatGen<R, D>, S>;

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
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, S>, depth: D, gen: Genable<T, S>): Enhanced<FlatGen<R, D>, S>;

    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, S>, depthOrGen?: D | Genable<T, S>, gen?: Genable<T, S>):
        Enhanced<FlatGen<R, D>, S>
        | (<X, Y = FlatGen<T, D>>(gen: Genable<X, S>) => Enhanced<Y, S>)
        | (<X, Y = FlatGen<T, D>>(gen: Genable<X, S>, depth?: D) => Enhanced<Y, S>);

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     */
    slice<T>(start: number, end: number): <X>(iter: Genable<X, S>) => Enhanced<X, S>;

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     * @param iter
     */
    slice<T>(start: number, end: number, iter: Genable<T, S>): Enhanced<T, S>;

    slice<T>(start: number, end: number, iter?: Genable<T, S>):
        Enhanced<T, S>
        | (<X>(gen: Genable<X, S>) => Enhanced<X, S>);

    /**
     * Concatenates generators (or iterators or iterables).
     *
     * Ensures that any supplied generators are terminated when this is terminated.
     * @param gens zero or more additional [[Genable]] to provide values.
     */
    concat<T extends Genable<any, S>[]>(...gens: T): Enhanced<GenUnion<T>, S>;


    /**
     * Reduces **gen** like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     * @param f
     * @param gen
     */
    reduce<A, T>(f: Reducer<A, T, T, S>, gen: Genable<T, S>): ReturnValue<A, S>;

    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * **Array.prototype.reduce**. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T>(f: Reducer<A, T, T, S>): (gen: Genable<T, S>) => ReturnValue<A, S>;

    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T>(f: Reducer<A, T, A, S>): (init: A, gen: Genable<T, S>) => ReturnValue<A, S>;

    /**
     * Reduces **gen** like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     * @param f
     * @param init
     * @param gen
     */
    reduce<A, T>(f: Reducer<A, T, A, S>, init: A, gen: Genable<T, S>): ReturnValue<A, S>;

    /**
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * Alternatively, the init value can be supplied along with the generator as a second argument.
     * @param f
     * @param init
     */
    reduce<A, T>(f: Reducer<A, T, A>, init: A): (gen: Genable<T, S>) => ReturnValue<A, S>;

    reduce<A, T>(
        f: Reducer<A, T, A | T, S>,
        initOrGen?: Value<A, S> | Genable<T, S>,
        gen?: Genable<T, S>
    ): Value<A, S>
        | ((gen: Genable<T, S>) => Value<A, S>)
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
    some<T>(p: IndexedPredicate<T, S>, thisArg?: any): (gen: Genable<T, S>) => ReturnValue<boolean, S>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     */
    some<T>(p: IndexedPredicate<T, S>): (gen: Genable<T, S>, thisArg?: any) => ReturnValue<boolean, S>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    some<T>(p: IndexedPredicate<T, S>, gen: Genable<T, S>): ReturnValue<boolean, S>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    some<T>(p: IndexedPredicate<T, S>, thisArg: any, gen: Genable<T, S>): ReturnValue<boolean, S>;

    some<T>(
        pred: IndexedPredicate<T, S>,
        thisOrGen?: any | Genable<T, S>,
        gen?: Genable<T, S>
    ): ReturnValue<boolean, S> | ((gen: Genable<T, S>) => ReturnValue<boolean, S>);

    /**
     * Returns `false` and terminates the generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    every<T>(p: IndexedPredicate<T, S>, thisArg?: any): (gen: Genable<T, S>) => ReturnValue<boolean, S>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     */
    every<T>(p: IndexedPredicate<T, S>): (gen: Genable<T, S>, thisArg?: any) => ReturnValue<boolean, S>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    every<T>(p: IndexedPredicate<T, S>, gen: Genable<T, S>): ReturnValue<boolean, S>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    every<T>(p: IndexedPredicate<T, S>, thisArg: any, gen: Genable<T, S>): ReturnValue<boolean, S>;

    every<T>(
        pred: IndexedPredicate<T, S>,
        genOrThis?: any | Genable<T, S>,
        gen?: Genable<T, S>
    ): ReturnValue<boolean, S> | ((gen: Genable<T, S>) => ReturnValue<boolean, S>);

    /**
     * Returns a new generator that repeats the last value returned by **gen** (or `undefined` if **gen**
     * did not return any values).
     *
     * @param gen
     * @param max
     */
    repeatLast<T>(gen: Genable<T, S>, max: number): Enhanced<T | undefined, S>;


    /**
     * Returns a new generator that repeats the supplied value.
     *
     * @param value the value to repeat
     * @param repetitions The number repetitions; the default is infinite.
     */
    repeat<T>(value: T, repetitions: number): Enhanced<T, S>;

    /**
     * Combines generators, returning a generator that produces a tuple with each of their results.
     *
     * Terminates when the first generator terminates. To get other behaviors, use with [[EnhancedGenerator.repeat]] or
     * [[EnhancedGenerator.repeatLast]].
     * @param gens
     */
    zip<G extends (Genable<any, S>)[]>(...gens: G): Enhanced<UnwrapGen<S, G>, S>;

    /**
     * Returns a function that joins the elements produced by a [[Genable]], analogous to `Array.prototype.join`.
     * @param sep (default = ',')
     */
    join(sep: string): <T>(gen: Genable<T, S>) => ReturnValue<string, S>;

    /**
     * Joins the elements produced by a [[Genable]], analogous to `Array.prototype.join`.
     * @param gen
     * @param sep
     */
    join<T>(gen: Genable<T, S>, sep?: string): ReturnValue<string, S>;
    join<T>(genOrSeparator: Genable<T, S>|string, sep?: string): ReturnValue<string, S> | (<X>(gen: Genable<X>) => ReturnValue<string, S>);

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
    merge<E extends any, G extends (Genable<E, S>)[] = (Genable<E, S>)[]>(...sources: G): Enhanced<E, S>;

    /**
     * Returns a function that sorts the supplied sources and returns a sorted array.
     * @param cmp a comparison function
     */
    sort<E>(cmp?: (a: E, b: E) => number): (...sources: Genable<E, S>[]) => ReturnValue<E[], S>;
//
    enhance<T>(gen: Genable<T, S>): Enhanced<T, S>;
}

/**
 * An enhanced `Generator`
 * @typeParam T The value type yielded by the `Generator`.
 * @typeParam S Selects for Sync or Async operation.
 */
export type Enhanced<T, S extends SyncType, TReturn = any, TNext = unknown> = {
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
    <T>(gen: Genable<T, S>, ...rest: Optional) => Enhanced<T, S>;

/**
 * An operator that takes a [[Genable]], optionals, and returns a relate type,
 * often an [[Enhanced]].
 * @typeParam S Selects for Sync or Async operation
 * @typeParam T the element type of the [[Genable]]
 * @typeParam Optional an array of types with any additional arguments after the [[Genable]]
 * @typeParam R the return type; defaults to [[Enhanced|Enhanced\\<T, S>]].
 */
export type GenOpValue<S extends SyncType, T, Optional extends any[] = [], R = Enhanced<T, S>> =
    (gen: Genable<T, S>, ...rest: Optional) => R;

export type GenIteratorResult<T, TReturn, S extends SyncType> =
    {
        sync: IteratorResult<T, TReturn>;
        async: Promise<IteratorResult<T, TReturn>>;
    }[S];

export type GenVoid<S extends SyncType> = {
    sync: void;
    async: Promise<void>;
}[S];

export type UnwrapArray<T> = T extends Array<infer E> ? E : never;

