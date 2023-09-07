/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */
/**
 * @internal
 * @module sync-impl
 *
 */

import type {
    Enhanced, FlatGen, Genable, GeneratorOps, GenOp, GenOpValue, GenVoid,
    IndexedFn, IndexedPredicate, Reducer, ReturnValue, UnwrapArray,
    } from "./types";
import {doCatch, isGenable, isGenerator, isIterable, isIterator, toGenerator, toIterable, toIterator} from "./functions";
import {Enhancements} from "./enhancements";

type sync = 'sync';

/**
 * An extension to generators, that provides for operations like:
 * * map<T, R>(gen: Generator<T>) => (fn: T => R) => Generator<R>
 * * EnhancedGenerator<T>.map<R>(fn: T => R) => Generator<R>
 * @packageDocumentation
 * @module Generators
 * @preferred
 */

class Sync_ implements GeneratorOps<sync> {
    /**
     * Return a generator that yields the supplied values.
     * @param values
     */
    of<T extends any[], TReturn, TNext>(...values: T):
        Enhanced<UnwrapArray<T>, sync, TReturn, TNext>
    {
        return this.enhance(values);
    }
    /**
     * Return all of the values from this generator as an array. You do not want to call this on an
     * infinite generator (for obvious reasons); consider using [[EnhancedGenerator.slice]] or
     * [[EnhancedGenerator.limit]] to limit the size before calling this.
     */
    asArray<T, TReturn, TNext>(gen: Genable<T, sync, TReturn, TNext>):
        T[]
    {
        return [...toIterable<T, TReturn, TNext>(gen)];
    };

    limit<T, TReturn, TNext>(max: number, gen: Genable<T, sync, TReturn, TNext>):
        Enhanced<T, sync, TReturn, TNext>;
    limit(max: number): GenOp<sync>;

    limit<T, TReturn, TNext>(max: number, gen?: Genable<T, sync, TReturn, TNext>):
        Enhanced<T, sync, TReturn, TNext>
        | GenOp<sync>
    {
        let self: EnhancedGenerator<T, TReturn, TNext>;
        function *limit<X, XReturn, XNext>(gen: Iterator<X, XReturn, XNext>): Generator<X, XReturn, XNext> {
            let nr: XNext;
            let limited: boolean = false;
            try {
                for (let i = 0; i < max; i++) {
                    const r = gen.next(nr!);
                    if (r.done) {
                        return r.value;
                    }
                    try {
                        nr = yield r.value;
                    } catch (e) {
                        gen.throw?.(e);
                    }
                }
                limited = true;
                const err = new RangeError(`Generator produced excessive values > ${max}.`);
                gen.throw?.(err);
                throw err;
            } finally {
                if (!limited) {
                    gen.return?.(self?.returning);
                    // Even if the supplied generator refuses to terminate, we terminate.
                }
            }
        }
        if (gen) {
            return self = this.enhance(limit(toIterator(gen)));
        }
        return <X, XReturn, XNext>(gen: Genable<X, sync, XReturn, XNext>) =>
            this.enhance(limit(toIterator(gen)));
    }

    forEach<T, TReturn, TNext>(f: IndexedFn<T, void, sync>, thisArg: any, gen: Genable<T, sync, TReturn, TNext>):
        GenVoid<sync>;
    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param gen the generator.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T, TReturn, TNext>(f: IndexedFn<T, void, sync>, gen: Genable<T, sync, TReturn, TNext>):
        GenVoid<sync>;
    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T, void, sync>, thisArg?: any):
        <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>) =>
            GenVoid<sync>;
    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T, void, sync>):
        <TReturn, TNext>(gen: Genable<T, sync, TReturn, TNext>, thisArg?: any) =>
            GenVoid<sync>;

    forEach<T, TReturn, TNext>(
            f: IndexedFn<T, void, sync>,
            thisArgOrGen?: Genable<T, sync, TReturn, TNext>|any,
            gen?: Genable<T, sync, TReturn, TNext>
        )
    {
        const forEach = <XReturn, XNext>(f: IndexedFn<T, void, sync>, thisArg: any, gen: Genable<T, sync, XReturn, XNext>):
                GenVoid<sync> =>
            {
                const it = toIterator(gen);
                let idx = 0;
                while (true) {
                    const r = it.next();
                    if (r.done) return;
                    f.call(thisArg, r.value, idx++);
                }
            };
        if (gen) return forEach(f, thisArgOrGen, gen);
        if (isGenable<T>(thisArgOrGen)) return forEach(f, undefined, thisArgOrGen);
        return <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>, thisArg?: any) =>
            forEach<XReturn, XNext>(f, thisArg ?? thisArgOrGen, gen);
    }

    map<T, V>(f: IndexedFn<T, V, sync>):
        GenOpValue<sync, T, V>;
    map<T, V>(f: IndexedFn<T, V, sync>, thisArg?: any):
        GenOpValue<sync, T, V>;
    map<T, V, TReturn, TNext>(f: IndexedFn<T, V, sync>, gen: Genable<T, sync, TReturn, TNext>):
        Enhanced<V, sync, TReturn, TNext>;
    map<T, V, TReturn, TNext>(f: IndexedFn<T, V, sync>, thisArg: any, gen: Genable<T, sync, TReturn, TNext>):
        Enhanced<V, sync, TReturn, TNext>;
    map<T, V, TReturn, TNext>(f: IndexedFn<T, V, sync>, thisArg?: any | Genable<T, sync, TReturn, TNext>, iter?: Genable<T, sync, TReturn, TNext>):
        EnhancedGenerator<V, TReturn, TNext>
        | (<XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>) => EnhancedGenerator<V, XReturn, XNext>)
        | (<XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>, thisArg?: any) => EnhancedGenerator<V, XReturn, XNext>)
    {
        const map = <XReturn, XNext>(thisArg: any, iter: Genable<T, sync, XReturn, XNext>) => {
            const gen = toGenerator(iter);
            let self: EnhancedGenerator<V, XReturn, XNext>;
            function* map(): Generator<V, XReturn, XNext> {
                let nr: XNext;
                let idx = 0;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = gen.next(nr!);
                                if (r.done) return r.value;
                                const v: V = f.call(thisArg, r.value, idx++);
                                try {
                                    nr = yield v;
                                } catch (e) {
                                    gen.throw(e);
                                }
                            }
                        } finally {
                            const x = gen.return(self?.returning);
                            // If the wrapped generator aborted the return, we will, too.
                            if (!x.done) {
                                // noinspection ContinueOrBreakFromFinallyBlockJS
                                break;
                            }
                        }
                    }
                }
            }
            return self = this.enhance(map());
        };
        if (iter) return map(thisArg, iter);
        if (isGenable<T, TReturn, TNext>(thisArg)) return map(undefined, thisArg);
        return <XReturn, XNext>(gen: Genable<T, sync,XReturn, XNext>, genThisArg?: any) =>
            map(genThisArg ?? thisArg, gen);
    }

    /**
     * Return a function that filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, sync>):
        GenOpValue<sync, T, T>;

    /**
     * Return a function that filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, sync>, thisArg: any):
        GenOpValue<sync, T, T>;

    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T, TReturn, TNext>(f: IndexedPredicate<T, sync>, iter: Genable<T, sync, TReturn, TNext>):
        Enhanced<T, sync, TReturn, TNext>;
    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T, TReturn, TNext>(f: IndexedPredicate<T, sync>, thisArg: any, iter: Genable<T, sync, TReturn, TNext>):
        Enhanced<T, sync, TReturn, TNext>;

    /**
     * Return a function that filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @param iter the [[Genable]] to filter.
     * @typeParam T the type of value.
     */
    filter<T, TReturn, TNext>(
        f: IndexedPredicate<T, sync>,
        thisArg?: any | Genable<T, sync, TReturn, TNext>,
        iter?: Genable<T, sync, TReturn, TNext>
    ):
        Enhanced<T, sync, TReturn, TNext>
        | GenOpValue<sync, T, T>
    {
        const filter = <XReturn, XNext>(thisArg: any, iter: Genable<T, sync, XReturn, XNext>) => {
            const gen = toGenerator(iter);
            let self: EnhancedGenerator<T, TReturn, TNext>;
            function* filter<V>(f: IndexedPredicate<T, sync>): Generator<T> {
                let nr: any = undefined;
                let idx = 0;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = gen.next(nr);
                                if (r.done) return r.value;
                                if (f.call(thisArg, r.value, idx++)) {
                                    try {
                                        nr = yield r.value;
                                    } catch (e) {
                                        gen.throw(e);
                                    }
                                }
                            }
                        } finally {
                            const x = gen.return?.(self?.returning);
                            // If the wrapped generator aborted the return, we will, too.
                            if (!x?.done) {
                                // noinspection ContinueOrBreakFromFinallyBlockJS
                                break;
                            }
                        }
                    }
                }
            }
            return self = this.enhance(filter(f));
        };

        if (iter) return filter(thisArg, iter);
        if (isGenable<T>(thisArg)) return filter(undefined, thisArg);
        return <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>, genThisArg?: any) =>
            filter(genThisArg ?? thisArg, gen);
    }

    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     */
    flat<D extends number>(depth: D):
        <X, XReturn = X, XNext = X>(gen: Genable<X, sync, XReturn, XNext>) =>
            Enhanced<sync, FlatGen<X, D>, XReturn, XNext>;
    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     * @param gen
     */
    flat<D extends number, T, TReturn, TNext>(depth: D, gen: Genable<T, sync, TReturn, TNext>):
        Enhanced<sync, FlatGen<T, D>, TReturn, TNext>;
    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param gen
     * @param depth default = 1
     */
    flat<D extends number, T, TReturn, TNext>(gen: Genable<T, sync, TReturn, TNext>, depth?: D):
        Enhanced<sync, FlatGen<T, D>, TReturn, TNext>;

    flat<D extends number, T, TReturn, TNext>(
        depth: D|Genable<T, sync, TReturn, TNext>,
        gen?: Genable<T, sync, TReturn, TNext> | D
    ):
        Enhanced<sync, FlatGen<T, D>, TReturn, TNext>
        | (<X, XReturn, XNext>(gen: Genable<X, sync, XReturn, XNext>) => Enhanced<sync, FlatGen<X, D>, XReturn, XNext>)
    {
        const flat = <X, XReturn, XNext>(depth: D, gen: Genable<X, sync, XReturn, XNext>) => {
            let self: EnhancedGenerator<FlatGen<X, D>, XReturn, XNext>;
            const gens = new Set<Generator>();
            if (isGenerator(gen)) gens.add(gen);

            function* flat<D extends number>(it: Iterator<unknown, XReturn, XNext>, depth: D): Generator<FlatGen<X, D>, XReturn, XNext> {
                let nr: any = undefined;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = it.next(nr);
                                if (r.done) return r.value;
                                const v = r.value;
                                if (isGenerator(v)) {
                                    gens.add(v);
                                }
                                try {
                                    if (depth > 0 && isIterator<unknown, XReturn, XNext>(v)) {
                                        yield* flat(v, depth - 1);
                                    } else if (depth > 0 && isIterable(v)) {
                                        yield* flat(toIterator<unknown, XReturn, XNext>(v), depth - 1)
                                    } else {
                                        nr = yield r.value as FlatGen<T, D>;
                                    }
                                } catch (e) {
                                    it.throw?.(e);
                                }
                            }
                        } finally {
                            const x = it.return?.(self?.returning);
                            if (isGenerator(it)) gens.delete(it);
                            // If the wrapped generator aborted the return, we will, too.
                            if (x && !x.done) {
                                // noinspection ContinueOrBreakFromFinallyBlockJS
                                break;
                            }
                            for (const g of gens) {
                                g.return(self?.returning);
                            }
                        }
                    }
                }
            }

            return self = this.enhance(flat(toIterator(gen), depth));
        }
        if (typeof depth === 'number') {
            if (gen) {
                if (isGenable(gen)) {
                    return flat(depth, gen);
                } else {
                    throw new TypeError(`Invalid Genable: ${gen}`);
                }
            }
            return <X, XReturn, XNext>(gen: Genable<X, sync, XReturn, XNext>) =>
                flat(depth, gen);
        } else if (isGenable(depth)) {
            return flat((gen ?? 1) as D, depth);
        }
        throw new TypeError(`Illegal arguments to flat()`);
    }

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
    flatMap<D extends number, R extends FlatGen<T, D>, T>(f: IndexedFn<T, R, sync>, depth: D):
        <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>) =>
            Enhanced<R, sync, XReturn, XNext>;

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a function that accepts a generator, and returns another generator that yields the individual value
     * at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     */
    flatMap<D extends number, R extends FlatGen<T, D>, T>(f: IndexedFn<T, R, sync>):
        <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>, depth?: D) =>
            Enhanced<R, sync, XReturn, XNext>;
    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a generator that yields the individual values at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param gen
     */
    flatMap<D extends number, R extends FlatGen<T, D>, T, TReturn, TNext>(f: IndexedFn<T, R, sync>, gen: Genable<T, sync, TReturn, TNext>):
        Enhanced<R, sync, TReturn, TNext>;
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
    flatMap<D extends number, R extends FlatGen<T, D>, T, TReturn, TNext>(f: IndexedFn<T, R, sync>, depth: D, gen: Genable<T, sync, TReturn, TNext>):
        Enhanced<R, sync, TReturn, TNext>;

    flatMap<D extends number, R extends FlatGen<T, D>, T, TReturn, TNext>(
            f: IndexedFn<T, R, sync>,
            depthOrGen?: D | Genable<T, sync, TReturn, TNext>,
            gen?: Genable<T, sync, TReturn, TNext>
        ):
            Enhanced<R, sync, TReturn, TNext>
            | (
                <X, Y extends FlatGen<T, D>, XReturn, XNext>(gen: Genable<X, sync, XReturn, XNext>) =>
                Enhanced<Y, sync, XReturn, XNext>
            )
            | (
                <X, Y extends FlatGen<T, D>, XReturn, XNext>(gen: Genable<X, sync, XReturn, XNext>, depth?: D) =>
                    Enhanced<Y, sync, XReturn, XNext>
            )
    {
        const flatMap = <X, XReturn, XNext>(depth: D, gen: Genable<X, sync, XReturn, XNext>) => {
            let self: Enhanced<FlatGen<X, D>, sync, XReturn, XNext>;
            let idx = 0;

            function* flatMap<D extends number, Y, YReturn, YNext>(it: Iterator<Y, YReturn, YNext>, depth: D):
                Generator<FlatGen<X, D>, XReturn, XNext>
            {
                let nr: YNext;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = it.next(nr!);
                                if (r.done) return r.value as unknown as XReturn;
                                const v = f(r.value as unknown as T, idx++);
                                try {
                                    if (isIterator<unknown, XReturn, XNext>(v)) {
                                        if (depth > 1) {
                                            yield* flatMap(v, depth - 1);
                                        } else if (depth === 1) {
                                            yield* toGenerator(v);
                                        } else {
                                            yield v;
                                        }
                                    } else if (isIterable(v)) {
                                        if (depth > 1) {
                                            yield* flatMap(toIterator<unknown, XReturn, XNext>(v), depth - 1);
                                        } else if (depth === 1) {
                                            yield* toGenerator(v);
                                        } else {
                                            yield v;
                                        }
                                    } else {
                                        nr = (yield v) as unknown as YNext;
                                    }
                                } catch (e) {
                                    it.throw?.(e);
                                }
                            }
                        } finally {
                            const x = it.return?.(self?.returning);
                            // If the wrapped generator aborted the return, we will, too.
                            if (x && !x.done) {
                                // noinspection ContinueOrBreakFromFinallyBlockJS
                                break;
                            }
                        }
                    }
                }
            }

            return self = this.enhance(flatMap(toIterator(gen), depth));
        }

        if (isGenable(gen)) {
            return flatMap(depthOrGen as D ?? 1 as D, gen);
        } else if (isGenable( depthOrGen)) {
            return flatMap(1 as D, depthOrGen);
        }
        return <X, XReturn, XNext>(gen: Genable<X, sync, XReturn, XNext>, depth?: D) =>
            flatMap(depthOrGen ?? depth ?? 1 as D, gen);
    }

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     */
    slice<T>(start: number, end: number):
        <X, XReturn, XNext>(iter: Genable<X, sync, XReturn, XNext>) =>
            Enhanced<X, sync, XReturn | undefined, XNext>;

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     * @param iter
     */
    slice<T, TReturn, TNext>(start: number, end: number, iter: Genable<T, sync, TReturn, TNext>):
        Enhanced<T, sync, TReturn | undefined, TNext>;

    slice<T, TReturn, TNext>(start: number, end: number, iter?: Genable<T, sync, TReturn, TNext>):
        Enhanced<T, sync, TReturn | undefined, TNext>
        | (
            <X, XReturn, XNext>(gen: Genable<X, sync, XReturn, XNext>) =>
                Enhanced<X, sync, XReturn | undefined, XNext>
        )
    {
        const slice = <X, XReturn, XNext>(iter: Genable<X, sync, XReturn, XNext>):
                Enhanced<X, sync, XReturn | undefined, XNext> =>
            {
                const it = toIterator(iter);
                function* slice(start: number, end: number) {
                    for (let i = 0; i < start; i++) {
                        const r = it.next();
                        if (r.done) return r.value;
                    }
                    if (end === Number.POSITIVE_INFINITY) {
                        yield* toIterable(it);
                    } else {
                        let nv: XNext;
                        while (true) {
                            try {
                                for (let i = start; i < end; i++) {
                                    const r = it.next(nv!);
                                    if (r.done) return r.value;
                                    try {
                                        nv = yield r.value;
                                    } catch (e) {
                                        const re = it.throw?.(e);
                                        if (re) {
                                            if (re.done) return re.value;
                                            nv = yield re.value;
                                        }
                                    }
                                }
                            } finally {
                                const x = it.return?.();
                                // If the wrapped generator aborted the return, we will, too.
                                if (x && !x.done) {
                                    // noinspection ContinueOrBreakFromFinallyBlockJS
                                    break;
                                }
                            }
                        }
                    }
                    return;
                }
                return this.enhance(slice(start, end));
        };
        if (!iter) return slice;
        return slice(iter);
    }

    /**
     * Concatenates generators (or iterators or iterables).
     *
     * Ensures that any supplied generators are terminated when this is terminated.
     * @param gens zero or more additional [[Genable]] to provide values.
     */
    concat<A>(...gens: Genable<A, sync, void, void>[]):
        Enhanced<A, sync, void, void>
    {
        let self: Enhanced<A, sync, void, void>;
        function* concat(): Generator<A, void, void> {
            let i = 0;
            try {
                for (; i < gens.length; i++) {
                    yield* toIterable<A, void, void>(gens[i]);
                }
            } finally {
                // Terminate any remaining generators.
                for (; i < gens.length; i++) {
                    const g = gens[i];
                    if (isGenerator(g)) {
                        g.return(self?.returning);
                    }
                }
            }
        }
        return self = this.enhance<A, void, void>(concat()) ;
    }

    /**
     * Reduces **gen** like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     * @param f
     * @param gen
     */
    reduce<A, T, TReturn, TNext>(f: Reducer<A, T, T, sync>, gen: Genable<T, sync, TReturn, TNext>):
        A;
    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * **Array.prototype.reduce**. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T, TReturn, TNext>(f: Reducer<A, T, T, sync>):
        (gen: Genable<T, sync, TReturn, TNext>) =>
            A;
    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T>(f: Reducer<A, T, A, sync>):
        <TReturn, TNext>(init: A, gen: Genable<T, sync, TReturn, TNext>) =>
            A;

    /**
     * Reduces **gen** like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     * @param f
     * @param init
     * @param gen
     */
    reduce<A, T, TReturn, TNext>(f: Reducer<A, T, A, sync>, init: A, gen: Genable<T, sync, TReturn, TNext>):
        A;

    /**
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * Alternatively, the init value can be supplied along with the generator as a second argument.
     * @param f
     * @param init
     */
    reduce<A, T>(f: Reducer<A, T, A, sync>, init: A):
        <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>) =>
            A;

    reduce<A, T, TReturn, TNext>(
        f: Reducer<A, T, A | T, sync>,
        initOrGen?: A | Genable<T, sync, TReturn, TNext>,
        gen?: Genable<T, sync, TReturn, TNext>
    ): A
        | (<XHome, XNext>(gen: Genable<T, sync, XHome, XNext>) => A)
        | ((f: (acc: A, v: T) => A, init: A) => A)
        | ((f: (acc: A | T, v: T) => A) => A)
    {

        const reduce = (init: A | undefined, it: Iterator<T,unknown,unknown>): A => {
            let acc: A | T | undefined = init;
            if (acc === undefined) {
                const r = it.next();
                if (r.done) throw new TypeError(`No initial value in reduce`);
                acc = r.value;
            }
            while (true) {
                const r = it.next();
                if (r.done) return acc as A;
                acc = f(acc, r.value);
            }
        };
        if (isGenable(gen)) {
            return reduce(initOrGen as A, toIterator(gen));
        } else if (isGenable(initOrGen)) {
            return reduce(undefined, toIterator(initOrGen));
        }
        return <XHome, XNext>(gen: Genable<T, sync, XHome, XNext>, init?: A) =>
            reduce(init ?? initOrGen, toIterator(gen));
    }

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    some<T>(p: IndexedPredicate<T, sync>, thisArg?: any):
        <XHome, XNext>(gen: Genable<T, sync, XHome, XNext>) =>
            ReturnValue<boolean, sync>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     */
    some<T>(p: IndexedPredicate<T, sync>):
        <XHome, XNext>(gen: Genable<T, sync, XHome, XNext>, thisArg?: any) =>
            ReturnValue<boolean, sync>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    some<T, TReturn, TNext>(p: IndexedPredicate<T, sync>, gen: Genable<T, sync, TReturn, TNext>):
        ReturnValue<boolean, sync>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    some<T, TReturn, TNext>(p: IndexedPredicate<T, sync>, thisArg: any, gen: Genable<T, sync, TReturn, TNext>):
        ReturnValue<boolean, sync>;

    some<T, TReturn, TNext>(
        pred: IndexedPredicate<T, sync>,
        thisOrGen?: any | Genable<T, sync, TReturn, TNext>,
        gen?: Genable<T, sync, TReturn, TNext>
    ):
        ReturnValue<boolean, sync>
        | (<XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>, thisArg?: any) =>
            ReturnValue<boolean, sync>)
    {
        const some = <XReturn, XNext>(thisArg: any, it: Iterator<T, XReturn, XNext>): boolean => {
            let i = 0;
            while (true) {
                const r = it.next();
                if (r.done) return false;
                if (pred.call(thisArg, r.value, i++)) return true;
            }
        };
        if (isGenable(gen)) {
            return some(thisOrGen, toIterator(gen));
        } else if (isGenable<T, TReturn, TNext>(thisOrGen)) {
            return some(undefined, toIterator(thisOrGen));
        } else {
            return <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>, thisArg?: any) =>
                some<XReturn, XNext>(thisArg ?? thisOrGen, toIterator(gen));
        }
    }

    /**
     * Returns `false` and terminates the generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    every<T>(p: IndexedPredicate<T, sync>, thisArg?: any):
        <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>) =>
            ReturnValue<boolean, sync>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     */
    every<T>(p: IndexedPredicate<T, sync>):
        <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext >, thisArg?: any) =>
            ReturnValue<boolean, sync>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    every<T, TReturn, TNext>(p: IndexedPredicate<T, sync>, gen: Genable<T, sync, TReturn, TNext>):
        ReturnValue<boolean, sync>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    every<T, TReturn, TNext>(p: IndexedPredicate<T, sync>, thisArg: any, gen: Genable<T, sync, TReturn, TNext>):
        ReturnValue<boolean, sync>;

    every<T, TReturn, TNext>(
        pred: IndexedPredicate<T, sync>,
        genOrThis?: any | Genable<T, sync, TReturn, TNext>,
        gen?: Genable<T, sync, TReturn, TNext>
    ):
        ReturnValue<boolean, sync>
        | (
            <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>) =>
                ReturnValue<boolean, sync>
        )
    {
        const every = <XReturn, XNext>(thisArg: any, it: Iterator<T, XReturn, XNext>): boolean => {
            let i = 0;
            while (true) {
                const r = it.next();
                if (r.done) return true;
                if (!pred.call(thisArg, r.value, i++)) return false;
            }
        };
        if (isGenable(gen)) {
            return every(genOrThis, toIterator(gen));
        } else if (isGenable(gen)) {
            return <XReturn, XNext>(gen: Genable<T, sync, XReturn, XNext>, thisArg?: any) =>
                every(thisArg ?? genOrThis, toIterator(gen));
        }
        throw new Error(`Invalid argument to every: ${gen ?? genOrThis}`);
    }

    /**
     * Returns a new generator that repeats the last value returned by **gen** (or `undefined` if **gen**
     * did not return any values).
     *
     * @param gen
     * @param max
     */
    repeatLast<T, TReturn, TNext>(
        gen: Genable<T, sync, TReturn, TNext>,
        max: number = Number.POSITIVE_INFINITY
    ):
        Enhanced<T, sync, TReturn | void, TNext>
    {
        const it = toIterator(gen);
        let nr: any;
        let self: EnhancedGenerator<T, TReturn | void, TNext>;

        function* repeatLast(): Generator<T, TReturn | void, TNext> {
            try {
                let last: T;
                while (true) {
                    const r = it.next(nr)
                    if (r.done) break;
                    try {
                        nr = yield (last = r.value);
                    } catch (e) {
                        const re = it.throw?.(e);
                        if (re) {
                            if (re.done) break;
                            yield last = re.value;
                        }
                    }
                }
                for (let i = 0; i < max; i++) {
                    yield last!;
                }
            } finally {
                it.return?.(self?.returning);
            }
        }

        return self = this.enhance(repeatLast());
    }

    /**
     * Returns a new generator that repeats the supplied value.
     *
     * @param value the value to repeat
     * @param repetitions The number repetitions; the default is infinite.
     */
    repeat<T, TReturn, TNext>(value: T, repetitions: number = Number.POSITIVE_INFINITY):
        Enhanced<T, sync, TReturn | void, TNext>
    {
        function* repeat(): Generator<T, TReturn | void, TNext> {
            for (let i = 0; i < repetitions; i++) {
                yield value;
            }
        }

        return this.enhance(repeat());
    }

    /**
     * Combines generators, returning a generator that produces a tuple with each of their results.
     *
     * Terminates when the first generator terminates. To get other behaviors, use with [[EnhancedGenerator.repeat]] or
     * [[EnhancedGenerator.repeatLast]].
     * @param gens
     */

    zip<T, TReturn, TNext>(...gens: Array<Genable<T, sync, TReturn, TNext>>):
        Enhanced<Array<T>, sync, TReturn, TNext>
    {
        if (gens.length === 0) return this.enhance([]);
        const its = gens.map(toIterator);
        let done = false;
        let self: Enhanced<Array<T>, sync, TReturn, TNext>;

        function* zip2(): Generator<Array<T>, TReturn, TNext> {
            try {
                while (true) {
                    let result: Array<T> = [];
                    for (const g of its) {
                        const r = g.next();
                        if (r.done) {
                            done = true;
                            return r.value as TReturn;
                        }
                        (result as any[]).push(r.value);
                    }
                    try {
                        yield result;
                    } catch (e) {
                        for (const g of gens) {
                            try {
                                // Weird need for a typecast here.
                                (g as any).throw?.(e);
                            } catch {
                                // Ignore
                            }
                        }
                        throw e;
                    }
                }
            } finally {
                if (!done) {
                    for (const g of gens) {
                        try {
                            // Weird need for a typecast here.
                            (g as any).return?.(self?.returning);
                        } catch {
                            // Ignore
                        }
                    }
                }
            }
        }

        return self = this.enhance(zip2());
    }

    /**
     * Returns a function that joins the elements produced by a [[Genable]], analogous to `Array.prototype.join`.
     * @param sep (default = ',')
     */
    join(sep: string):
        <X, XReturn, XNext>(gen: Genable<X, sync, XReturn, XNext>) =>
            ReturnValue<string, sync>;

    /**
     * Joins the elements produced by a [[Genable]], analogous to `Array.prototype.join`.
     * @param gen
     * @param sep
     */
    join<T, TReturn, TNext>(gen: Genable<T, sync, TReturn, TNext>, sep?: string):
        ReturnValue<string, sync>;

    join<T, TReturn, TNext>(
        genOrSeparator: Genable<T, sync, TReturn, TNext>|string,
        sep?: string
    ):
        string
        | (<X, XReturn, XNext>(gen: Genable<X, sync, XReturn, XNext>) => string)
    {
        if (typeof genOrSeparator === 'string') {
            sep = genOrSeparator;
            return <X, XReturn, XNext>(gen: Genable<X, sync, XReturn, XNext>) =>
                this.join(gen, sep);
        }
        return [...toIterable(genOrSeparator)].join(sep);
    }

    /**
     * Returns a new generator that returns values from each of the supplied sources as they are available.
     * These will be taken in round-robin fashion from each non-terminated generator, until all have
     * terminated. The yielded values will not be distinguished by which which source they are taken; for
     * that, another method will be supplied.
     *
     * Any calls to `Generator.throw()` or `Generator.return()` will be passed to all non-terminated
     * sources.
     * @param sources
     */

    merge<T, TReturn, TNext>(...sources: Array<Genable<T, sync, TReturn, TNext>>):
        Enhanced<T, sync, TReturn, TNext>
    {
        let self: Enhanced<T, sync, TReturn, TNext>;
        let gens: Array<Iterator<T, TReturn, TNext> | null> = sources.map(toIterator);
        function* merge<X, XReturn, XNext>(gens: Array<Iterator<X, XReturn, XNext> | null>):
            Generator<X, XReturn, XNext>
        {
            let done = false;
            let running = true;
            let nv: XNext;
            try {
                while (running) {
                    running = false;
                    for (let i = 0; i < gens.length; i++) {
                        const g = gens[i];
                        if (g) {
                            const r = g.next(nv!);
                            if (r.done) {
                                gens[i] = null;
                            } else {
                                running = true;
                                try {
                                    nv = yield r.value;
                                } catch (e) {
                                    gens.forEach(doCatch(g => g?.throw?.(e)));
                                }
                            }
                        }
                    }
                }
                done = true;
            } finally {
                if (!done) {
                    gens.forEach(doCatch(g => g?.return?.(self?.returning)));
                }
            }
            return self?.returning;
        }
        return self = this.enhance(merge(gens));
    }

    /**
     * Returns a function that sorts the supplied sources and returns a sorted array.
     * @param cmp a comparison function
     */
    sort<T>(cmp?: ((a: T, b: T) => number)) {
        return <TReturn, TNext>(...sources: Array<Genable<T, sync, TReturn, TNext>>) => {
            const result: T[] = this.merge(...sources).asArray();
            return result.sort(cmp);
        }
    }

    /**
     * Enhance an existing generator (or iterator or iterable) to be a EnhancedGenerator.
     * @param gen
     */
    enhance<T, TReturn, TNext>(gen: Genable<T, sync, TReturn, TNext>):
        EnhancedGenerator<T, TReturn, TNext>
    {
        const gen2 = toGenerator(gen) as Partial<EnhancedGenerator<T, TReturn, TNext>>;
        const old = Object.getPrototypeOf(gen2);
        const proto = Object.create(EnhancedGenerator.prototype);
        proto.return = (v: TReturn) => (gen2.returning = v, old.return.call(gen2, v));
        proto[Symbol.iterator] = () => gen2;
        Object.setPrototypeOf(gen2, proto);
        return gen2 as EnhancedGenerator<T, TReturn, TNext>;
    }
}

/**
 * Utilities to create and use generators which can be manipulated in various ways.
 *
 * Most methods come both as instance (prototype) methods and as static methods. They
 * provide equivalent functionality, but the static methods allow use on `Iterator` and
 * `Iterable` objects without first converting to a generator.
 *
 * The [[EnhancedGenerator.enhance]] method will add additional instance methods to
 * an ordinary generator's prototype (a new prototype, **not** modifying any global prototype!).
 * It can also be used to convert `Iterator` and `Iterable` objects to [[EnhancedGenerator]].
 *
 * For methods which return a EnhancedGenerator, care is take to propagate any `Generator.throw`
 * and `Generator.return` calls to any supplied generators, so they can properly terminate.
 *
 * The exception is [[EnhancedGenerator.flat]] (and by extension, [[EnhancedGenerator.flatMap]]), which cannot know what nested generators
 * they might encounter in the future. Any generators encountered so far will be terminated, however.
 *
 * @typeParam T the type of values returned in the iteration result.
 * @typeParam TReturn the type of values returned in the iteration result when the generator terminates
 * @typeParam TNext the type of value which can be passed to `.next(val)`.
 */
export abstract class EnhancedGenerator<T, TReturn, TNext>
    extends Enhancements<T, TReturn, TNext, sync>
    implements Generator<T, TReturn, TNext>,
        Iterable<T>,
        Iterator<T, TReturn, TNext>
{
    abstract [Symbol.toStringTag]: 'EnhancedGenerator';
}

/**
 * Factory for synchronous generator operators. See [[GeneratorOps]] for details.
 * @internal
 */
export const impl: GeneratorOps<sync> = new Sync_();
