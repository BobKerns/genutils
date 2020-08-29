/**
 * @module genutils
 * Copyright 2020 by Bob Kerns. Licensed under MIT license
 */

/**
 * This entry point loads synchronous extended generators
 * @packageDocumentation
 * @module sync
 * @preferred
 */

import type {Enhanced, FlatGen, Genable, GeneratorOps, GenOp, GenOpValue, GenUnion, IndexedFn, IndexedPredicate, Reducer, ReturnValue, UnwrapArray, UnwrapGen} from "./types";
// Should be 'import type' but that makes TS insist it can't be a value here even after defining it.
import {Sync} from './types';
import {isGenable, isGenerator, isIterable, isIterator, toGenerator, toIterable, toIterator} from "./functions";
import {Enhancements} from "./enhancements";

/**
 * An extension to generators, that provides for operations like:
 * * map<T, R>(gen: Generator<T>) => (fn: T => R) => Generator<R>
 * * EnhancedGenerator<T>.map<R>(fn: T => R) => Generator<R>
 * @packageDocumentation
 * @module Generators
 * @preferred
 */

class Sync_ implements GeneratorOps<Sync> {
    /**
     * Return a generator that yields the supplied values.
     * @param values
     */
    of<T extends any[]>(...values: T) : Enhanced<UnwrapArray<T>, Sync> {
        return this.enhance(values);
    }
    /**
     * Return all of the values from this generator as an array. You do not want to call this on an
     * infinite generator (for obvious reasons); consider using [[EnhancedGenerator.slice]] or
     * [[EnhancedGenerator.limit]] to limit the size before calling this.
     */
    asArray<T, G extends Genable<any>>(gen: G): T[] {
        return [...toIterable(gen)];
    };

    limit<T>(max: number, gen: Genable<T>): Enhanced<T, Sync>;
    limit(max: number): GenOp<Sync>;
    limit<T>(max: number, gen?: Genable<T>): Enhanced<T, Sync> | GenOp<Sync> {
        let self: EnhancedGenerator<T>;
        function *limit<X>(gen: Iterator<X>) {
            let nr = undefined;
            let limited: boolean = false;
            try {
                for (let i = 0; i < max; i++) {
                    const r = gen.next(nr);
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
                    gen.return?.(self.returning);
                    // Even if the supplied generator refuses to terminate, we terminate.
                }
            }
        }
        if (gen) {
            return self = this.enhance(limit(toIterator(gen)));
        }
        return <X>(gen: Genable<X>) => this.enhance(limit(toIterator(gen)));
    }

    forEach<T>(f: IndexedFn<T>, thisArg: any, gen: Genable<T>): void;
    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param gen the generator.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T>, gen: Genable<T>): void;
    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T>, thisArg?: any): (gen: Genable<T>) => void;
    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T>): (gen: Genable<T>, thisArg?: any) => void;
    forEach<T>(f: IndexedFn<T>, thisArgOrGen?: Genable<T>|any, gen?: Genable<T>) {
        const forEach = (f: IndexedFn<T>, thisArg: any, gen: Genable<T>) => {
            const it = toIterator(gen);
            let idx = 0;
            while (true) {
                const r = it.next();
                if (r.done) return r.value;
                f.call(thisArg, r.value, idx++);
            }
        };
        if (gen) return forEach(f, thisArgOrGen, gen);
        if (isGenable<T>(thisArgOrGen)) return forEach(f, undefined, thisArgOrGen);
        return (gen: Genable<T, Sync>, thisArg?: any) => forEach(f, thisArg ?? thisArgOrGen, gen);
    }

    map<T, V>(f: IndexedFn<T, V>): GenOpValue<Sync, T, [any?], Enhanced<V, Sync>>;
    map<T, V>(f: IndexedFn<T, V>, thisArg?: any): GenOpValue<Sync, T, [], Enhanced<V, Sync>>;
    map<T, V>(f: IndexedFn<T, V>, gen: Genable<T>): Enhanced<V, Sync>;
    map<T, V>(f: IndexedFn<T, V>, thisArg: any, gen: Genable<T>): Enhanced<V, Sync>;
    map<T, V>(f: IndexedFn<T, V>, thisArg?: any | Genable<T>, iter?: Genable<T>):
        EnhancedGenerator<V>
        | ((gen: Genable<T>) => EnhancedGenerator<V>)
        | ((gen: Genable<T>, thisArg?: any) => EnhancedGenerator<V>)
    {
        const map = (thisArg: any, iter: Genable<T>) => {
            const gen = toGenerator(iter);
            let self: EnhancedGenerator<V>;
            function* map(): Generator<V> {
                let nr = undefined;
                let idx = 0;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = gen.next(nr);
                                if (r.done) return r.value;
                                const v: V = f.call(thisArg, r.value, idx++);
                                try {
                                    nr = yield v;
                                } catch (e) {
                                    gen.throw(e);
                                }
                            }
                        } finally {
                            const x = gen.return(self.returning);
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
        if (isGenable<T>(thisArg)) return map(undefined, thisArg);
        return (gen: Genable<T>, genThisArg?: any) => map(genThisArg ?? thisArg, gen);
    }

    /**
     * Return a function that filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, Sync>): GenOpValue<Sync, T, [any?], Enhanced<T, Sync>>;

    /**
     * Return a function that filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, Sync>, thisArg: any): GenOpValue<Sync, T, [], Enhanced<T, Sync>>;

    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, Sync>, iter: Genable<T, Sync>): Enhanced<T, Sync>;
    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, Sync>, thisArg: any, iter: Genable<T, Sync>): Enhanced<T, Sync>;

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
    filter<T>(f: IndexedPredicate<T, Sync>, thisArg?: any | Genable<T, Sync>, iter?: Genable<T, Sync>):
        Enhanced<T, Sync>
        | GenOpValue<Sync, T, [], Enhanced<T, Sync>>
        | GenOpValue<Sync, T, [any?], Enhanced<T, Sync>>
    {
        const filter = (thisArg: any, iter: Genable<T, Sync>) => {
            const gen = toGenerator(iter);
            let self: EnhancedGenerator<T, Sync>;
            function* filter<V>(f: IndexedPredicate<T, Sync>): Generator<T> {
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
                            const x = gen.return?.(self.returning);
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
        return (gen: Genable<T, Sync>, genThisArg?: any) => filter(genThisArg ?? thisArg, gen);
    }

    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     */
    flat<T, D extends number = 1>(depth: D): <X>(gen: Genable<X>) => Enhanced<Sync, FlatGen<X, D>>;
    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     * @param gen
     */
    flat<T, D extends number = 1>(depth: D, gen: Genable<T>): Enhanced<Sync, FlatGen<T, D>>;
    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param gen
     * @param depth default = 1
     */
    flat<T, D extends number = 1>(gen: Genable<T>, depth?: D): Enhanced<Sync, FlatGen<T, D>>;
    flat<T, D extends number = 1>(depth: D|Genable<T>, gen?: Genable<T> | D):
        Enhanced<Sync, FlatGen<T, D>>
        | (<X>(gen: Genable<X>) => Enhanced<Sync, FlatGen<X, D>>)
    {
        const flat = <X>(depth: D, gen: Genable<X, Sync>) => {
            let self: EnhancedGenerator<FlatGen<X, D>>;
            const gens = new Set<Generator>();
            if (isGenerator(gen)) gens.add(gen);

            function* flat<D extends number>(it: Iterator<unknown>, depth: D): Generator<FlatGen<X, D>> {
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
                                    if (depth > 0 && isIterator(v)) {
                                        yield* flat(v, depth - 1);
                                    } else if (depth > 0 && isIterable(v)) {
                                        yield* flat(toIterator(v), depth - 1)
                                    } else {
                                        nr = yield r.value as FlatGen<T, D>;
                                    }
                                } catch (e) {
                                    it.throw?.(e);
                                }
                            }
                        } finally {
                            const x = it.return?.(self.returning);
                            if (isGenerator(it)) gens.delete(it);
                            // If the wrapped generator aborted the return, we will, too.
                            if (x && !x.done) {
                                // noinspection ContinueOrBreakFromFinallyBlockJS
                                break;
                            }
                            for (const g of gens) {
                                g.return(self.returning);
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
            return <X>(gen: Genable<X, Sync>) => flat(depth, gen);
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
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, Sync>, depth: D): (gen: Genable<T, Sync>) => Enhanced<FlatGen<R, D>, Sync>;

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a function that accepts a generator, and returns another generator that yields the individual value
     * at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     */
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, Sync>): (gen: Genable<T, Sync>, depth?: D) => Enhanced<FlatGen<R, D>, Sync>;
    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a generator that yields the individual values at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param gen
     */
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, Sync>, gen: Genable<T, Sync>): Enhanced<FlatGen<R, D>, Sync>;
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
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, Sync>, depth: D, gen: Genable<T, Sync>): Enhanced<FlatGen<R, D>, Sync>;
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, Sync>, depthOrGen?: D | Genable<T, Sync>, gen?: Genable<T, Sync>):
        Enhanced<FlatGen<R, D>, Sync>
        | (<X, Y = FlatGen<T, D>>(gen: Genable<X, Sync>) => Enhanced<Y, Sync>)
        | (<X, Y = FlatGen<T, D>>(gen: Genable<X, Sync>, depth?: D) => Enhanced<Y, Sync>)
    {
        const flatMap = <X>(depth: D, gen: Genable<X, Sync>) => {
            let self: Enhanced<FlatGen<X, D>, Sync>;
            let idx = 0;

            function* flatMap<D extends number>(it: Iterator<unknown>, depth: D): Generator<FlatGen<X, D>, undefined, unknown | undefined> {
                let nr: any = undefined;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = it.next(nr as undefined);
                                if (r.done) return r.value;
                                const v = f(r.value as FlatGen<T, D>, idx++);
                                try {
                                    if (isIterator(v)) {
                                        if (depth > 1) {
                                            yield* flatMap(v, depth - 1);
                                        } else if (depth === 1) {
                                            yield* toGenerator(v);
                                        } else {
                                            yield v;
                                        }
                                    } else if (isIterable(v)) {
                                        if (depth > 1) {
                                            yield* flatMap(toIterator(v), depth - 1);
                                        } else if (depth === 1) {
                                            yield* toGenerator(v);
                                        } else {
                                            yield v;
                                        }
                                    } else {
                                        nr = yield v;
                                    }
                                } catch (e) {
                                    it.throw?.(e);
                                }
                            }
                        } finally {
                            const x = it.return?.(self.returning);
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
        return <X>(gen: Genable<X, Sync>, depth?: D) => flatMap(depthOrGen ?? depth ?? 1 as D, gen);
    }

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     */
    slice<T>(start: number, end: number): <X>(iter: Genable<X, Sync>) => Enhanced<X, Sync>;
    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     * @param iter
     */
    slice<T>(start: number, end: number, iter: Genable<T, Sync>): Enhanced<T, Sync>;
    slice<T>(start: number, end: number, iter?: Genable<T, Sync>):
        Enhanced<T, Sync>
        | (<X>(gen: Genable<X, Sync>) => Enhanced<X, Sync>)
    {
        const slice = <X>(iter: Genable<X, Sync>) => {
            const it = toIterator(iter);
            function* slice(start: number, end: number) {
                for (let i = 0; i < start; i++) {
                    const r = it.next();
                    if (r.done) return r.value;
                }
                if (end === Number.POSITIVE_INFINITY) {
                    yield* toIterable(it);
                } else {
                    let nv = undefined;
                    while (true) {
                        try {
                            for (let i = start; i < end; i++) {
                                const r = it.next(nv);
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
                            const x = it.return?.(null);
                            // If the wrapped generator aborted the return, we will, too.
                            if (x && !x.done) {
                                // noinspection ContinueOrBreakFromFinallyBlockJS
                                break;
                            }
                        }
                    }
                }
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
    concat<T extends Genable<any, Sync>[]>(...gens: T): Enhanced<GenUnion<T>, Sync> {
        let self: Enhanced<GenUnion<T>, Sync>;
        function* concat() {
            let i = 0;
            try {
                for (; i < gens.length; i++) {
                    yield* toIterable(gens[i]);
                }
            } finally {
                // Terminate any remaining generators.
                for (; i < gens.length; i++) {
                    const g = gens[i];
                    if (isGenerator(g)) {
                        g.return(self.returning);
                    }
                }
            }
        }

        return self = this.enhance(concat());
    }

    /**
     * Reduces **gen** like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     * @param f
     * @param gen
     */
    reduce<A, T>(f: Reducer<A, T, T, Sync>, gen: Genable<T, Sync>): A;
    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * **Array.prototype.reduce**. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T>(f: Reducer<A, T, T, Sync>): (gen: Genable<T, Sync>) => A;
    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T>(f: Reducer<A, T, A, Sync>): (init: A, gen: Genable<T, Sync>) => A;
    /**
     * Reduces **gen** like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     * @param f
     * @param init
     * @param gen
     */
    reduce<A, T>(f: Reducer<A, T, A, Sync>, init: A, gen: Genable<T, Sync>): A;
    /**
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * Alternatively, the init value can be supplied along with the generator as a second argument.
     * @param f
     * @param init
     */
    reduce<A, T>(f: Reducer<A, T, A, Sync>, init: A): (gen: Genable<T, Sync>) => A;
    reduce<A, T>(
        f: Reducer<A, T, A | T, Sync>,
        initOrGen?: A | Genable<T, Sync>,
        gen?: Genable<T, Sync>
    ): A
        | ((gen: Genable<T, Sync>) => A)
        | ((f: (acc: A, v: T) => A, init: A) => A)
        | ((f: (acc: A | T, v: T) => A) => A)
    {

        const reduce = (init: A | undefined, it: Iterator<T>): A => {
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
        return (gen: Genable<T, Sync>, init?: A) => reduce(init ?? initOrGen, toIterator(gen));
    }

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    some<T>(p: IndexedPredicate<T, Sync>, thisArg?: any): (gen: Genable<T, Sync>) => ReturnValue<boolean, Sync>;
    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     */
    some<T>(p: IndexedPredicate<T, Sync>): (gen: Genable<T, Sync>, thisArg?: any) => ReturnValue<boolean, Sync>;
    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    some<T>(p: IndexedPredicate<T, Sync>, gen: Genable<T, Sync>): ReturnValue<boolean, Sync>;
    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    some<T>(p: IndexedPredicate<T, Sync>, thisArg: any, gen: Genable<T, Sync>): ReturnValue<boolean, Sync>;
    some<T>(
        pred: IndexedPredicate<T, Sync>,
        thisOrGen?: any | Genable<T, Sync>,
        gen?: Genable<T>
    ): ReturnValue<boolean, Sync> | ((gen: Genable<T, Sync>) => ReturnValue<boolean, Sync>)
    {
        const some = (thisArg: any, it: Iterator<T>): boolean => {
            let i = 0;
            while (true) {
                const r = it.next();
                if (r.done) return false;
                if (pred.call(thisArg, r.value, i++)) return true;
            }
        };
        if (isGenable(gen)) {
            return some(thisOrGen, toIterator(gen));
        } else if (isGenable(gen)) {
            return (gen: Genable<T, Sync>, thisArg?: any) =>
                some(thisArg ?? thisOrGen, toIterator(gen));
        }
        throw new Error(`Invalid argument to some: ${gen ?? thisOrGen}`);
    }

    /**
     * Returns `false` and terminates the generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    every<T>(p: IndexedPredicate<T, Sync>, thisArg?: any): (gen: Genable<T, Sync>) => ReturnValue<boolean, Sync>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     */
    every<T>(p: IndexedPredicate<T, Sync>): (gen: Genable<T, Sync>, thisArg?: any) => ReturnValue<boolean, Sync>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    every<T>(p: IndexedPredicate<T, Sync>, gen: Genable<T, Sync>): ReturnValue<boolean, Sync>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    every<T>(p: IndexedPredicate<T, Sync>, thisArg: any, gen: Genable<T, Sync>): ReturnValue<boolean, Sync>;
    every<T>(
        pred: IndexedPredicate<T, Sync>,
        genOrThis?: any | Genable<T, Sync>,
        gen?: Genable<T, Sync>
    ): ReturnValue<boolean, Sync> | ((gen: Genable<T, Sync>) => ReturnValue<boolean, Sync>)
    {
        const every = (thisArg: any, it: Iterator<T>): boolean => {
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
            return (gen: Genable<T, Sync>, thisArg?: any) =>
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
    repeatLast<T>(gen: Genable<T, Sync>, max: number = Number.POSITIVE_INFINITY): Enhanced<T | undefined, Sync> {
        const it = toIterator(gen);
        let nr: any;
        let self: EnhancedGenerator<T | undefined>;

        function* repeatLast() {
            try {
                let last = undefined
                while (true) {
                    const r = it.next(nr)
                    if (r.done) break;
                    try {
                        nr = yield last = r.value;
                    } catch (e) {
                        const re = it.throw?.(e);
                        if (re) {
                            if (re.done) break;
                            yield last = re.value;
                        }
                    }
                }
                for (let i = 0; i < max; i++) {
                    yield last;
                }
            } finally {
                it.return?.(self.returning);
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
    repeat<T>(value: T, repetitions: number = Number.POSITIVE_INFINITY): Enhanced<T, Sync> {
        function* repeat() {
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

    zip<G extends (Genable<any, Sync>)[]>(...gens: G) {
        if (gens.length === 0) return this.enhance([]);
        const its = gens.map(toIterator);
        let done = false;
        let self: Enhanced<UnwrapGen<Sync, G>, Sync>;

        function* zip2(): Generator<UnwrapGen<Sync, G>> {
            try {
                while (true) {
                    let result: UnwrapGen<Sync, G> = [] as unknown as UnwrapGen<Sync, G>;
                    for (const g of its) {
                        const r = g.next();
                        if (r.done) {
                            done = true;
                            return r.value;
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
                            (g as any).return?.(self.returning);
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
    join(sep: string): <T>(gen: Genable<T, Sync>) => ReturnValue<string, Sync>;

    /**
     * Joins the elements produced by a [[Genable]], analogous to `Array.prototype.join`.
     * @param gen
     * @param sep
     */
    join<T>(gen: Genable<T, Sync>, sep?: string): ReturnValue<string, Sync>;
    join<T>(genOrSeparator: Genable<T, Sync>|string, sep?: string): string | (<X>(gen: Genable<X, Sync>) => string) {
        if (typeof genOrSeparator === 'string') {
            sep = genOrSeparator;
            return <X>(gen: Genable<X, Sync>) => this.join(gen, sep);
        }
        return [...toIterable(genOrSeparator)].join(sep);
    }

    /**
     * Enhance an existing generator (or iterator or iterable) to be a EnhancedGenerator.
     * @param gen
     */
    enhance<T, R = any, N = undefined>(gen: Genable<T, Sync>): EnhancedGenerator<T, R, N> {
        const gen2 = toGenerator(gen) as Partial<EnhancedGenerator<T, R, N>>;
        const old = Object.getPrototypeOf(gen2);
        const proto = Object.create(EnhancedGenerator.prototype);
        proto.return = (v: any) => (gen2.returning = v, old.return.call(gen2, v));
        Object.setPrototypeOf(gen2, EnhancedGenerator.prototype);
        return gen2 as EnhancedGenerator<T, R, N>;
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
export abstract class EnhancedGenerator<T = unknown, TReturn = any, TNext = unknown>
    extends Enhancements<T, TReturn, TNext, Sync>
    implements Generator<T, TReturn, TNext>, Iterable<T>, Iterator<T> {

    abstract [Symbol.iterator](): EnhancedGenerator<T, TReturn, TNext>;
    [Symbol.toStringTag]: 'EnhancedGenerator';
}

/**
 * Factory for synchronous generator operators. See [[GeneratorOps]] for details.
 */
const Sync: GeneratorOps<Sync> = new Sync_();
export {Sync};

const makeProto = (base: any) => {
    const newProto = Object.create(base);
    const inherit = (proto: any) => {
        for (const k of Reflect.ownKeys(proto)) {
            if (k !== 'constructor') {
                newProto[k] = proto[k];
            }
        }
    };
    inherit(Enhancements.prototype);
    return newProto;
}

/**
 * @internal
 * @constructor
 */
function* Foo() {
}

/**
 * @internal
 */
export const GenProto = Object.getPrototypeOf(Foo());

// Make EnhancedGenerator inherit generator methods.
Object.setPrototypeOf(EnhancedGenerator.prototype, makeProto(GenProto));
Object.defineProperty(EnhancedGenerator.prototype, '_impl', {
    value: Sync,
    writable: false,
    enumerable: false,
    configurable: false
});
