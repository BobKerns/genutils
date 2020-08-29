/**
 * @module genutils
 * Copyright 2020 by Bob Kerns. Licensed under MIT license
 */

/**
 * This entry point loads asynchronous extended generators
 * @packageDocumentation
 * @module async
 * @preferred
 */

import type {AsyncGenable, AsyncIndexedFn, Enhanced, FlatGen, Genable, GeneratorOps, GenOp, GenOpValue, GenUnion, IndexedFn, IndexedPredicate, Reducer, ReturnValue, UnwrapArray, UnwrapGen} from "./types";
// Should be 'import type' but that makes TS insist it can't be a value here even after defining it.
import {Async} from './types';
import {isAsyncGenable, isAsyncGenerator, isAsyncIterable, isAsyncIterator, isGenable, isIterable, toAsyncGenerator, toAsyncIterable, toAsyncIterator} from "./functions";
import {Enhancements} from "./enhancements";

/**
 * Asynchronous implementation of enhanced generators
 */


class Async_ implements GeneratorOps<Async> {
    /**
     * Return a generator that yields the supplied values.
     * @param values
     */
    of<T extends any[]>(...values: T) : Enhanced<UnwrapArray<T>, Async> {
        return this.enhance(values);
    }

    async asArray<T>(gen: AsyncGenable<T>): Promise<T[]> {
        const it = toAsyncIterator(gen);
        const result: T[] = []
        while (true) {
            const r = await it.next();
            if (r.done) {
                return result;
            }
            result.push(r.value);
        }
    }

    limit<T>(max: number, gen: AsyncGenable<T>): Enhanced<T, Async>;
    limit(max: number): GenOp<Async>;
    limit<T>(max: number, gen?: AsyncGenable<T>): Enhanced<T, Async> | GenOp<Async> {
        let self: EnhancedAsyncGenerator<T>;
        async function *limit<X>(gen: AsyncIterator<X>) {
            let nr = undefined;
            let limited: boolean = false;
            try {
                for (let i = 0; i < max; i++) {
                    const r: any = await gen.next(nr);
                    if (r.done) {
                        return r.value;
                    }
                    try {
                        nr = yield r.value;
                    } catch (e) {
                        await gen.throw?.(e);
                    }
                }
                limited = true;
                const err = new RangeError(`Generator produced excessive values > ${max}.`);
                await gen.throw?.(err);
                throw err;
            } finally {
                if (!limited) {
                    await gen.return?.(self.returning);
                    // Even if the supplied generator refuses to terminate, we terminate.
                }
            }
        }
        if (gen) {
            return self = this.enhance(limit(toAsyncIterator(gen)));
        }
        return <X>(gen: AsyncGenable<X>) => this.enhance(limit(toAsyncIterator(gen)));
    }

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     * @param gen the generator.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: AsyncIndexedFn<T>, thisArg: any, gen: AsyncGenable<T>): Promise<void>;
    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param gen the generator.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: AsyncIndexedFn<T>, gen: AsyncGenable<T>): Promise<void>;
    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: AsyncIndexedFn<T>, thisArg?: any): (gen: AsyncGenable<T>) => Promise<void>;
    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: AsyncIndexedFn<T>): (gen: AsyncGenable<T>, thisArg?: any) => void;
    forEach<T>(f: AsyncIndexedFn<T>, thisArgOrGen?: AsyncGenable<T>|any, gen?: AsyncGenable<T>)
        : Promise<void> | ((gen: AsyncGenable<T>) => void | Promise<void>) {
        const forEach = async (f: AsyncIndexedFn<T>, thisArg: any, gen: AsyncGenable<T>) => {
            const it = toAsyncIterator(gen);
            let idx = 0;
            while (true) {
                const r = await it.next();
                if (r.done) return r.value;
                await f.call(thisArg, r.value, idx++);
            }
        };
        if (gen) return forEach(f, thisArgOrGen, gen);
        if (isAsyncGenable<T>(thisArgOrGen)) return forEach(f, undefined, thisArgOrGen);
        return (gen: AsyncGenable<T>, thisArg?: any) => forEach(f, thisArg ?? thisArgOrGen, gen);
    }

    map<T, V>(f: AsyncIndexedFn<T, V>): GenOpValue<Async, T, [any?], Enhanced<V, Async>>;
    map<T, V>(f: AsyncIndexedFn<T, V>, thisArg?: any): GenOpValue<Async, T, [], Enhanced<V, Async>>;
    map<T, V>(f: AsyncIndexedFn<T, V>, gen: AsyncGenable<T>): Enhanced<V, Async>;
    map<T, V>(f: AsyncIndexedFn<T, V>, thisArg: any, gen: AsyncGenable<T>): Enhanced<V, Async>;
    map<T, V>(f: AsyncIndexedFn<T, V>, thisArg?: any | AsyncGenable<T>, iter?: AsyncGenable<T>):
        EnhancedAsyncGenerator<V>
        | ((gen: AsyncGenable<T>) => EnhancedAsyncGenerator<V>)
        | ((gen: AsyncGenable<T>, thisArg?: any) => EnhancedAsyncGenerator<V>)
    {
        const map = (thisArg: any, iter: AsyncGenable<T>) => {
            const gen = toAsyncGenerator(iter);
            let self: EnhancedAsyncGenerator<V>;
            async function* map(): AsyncGenerator<V> {
                let nr: any = undefined;
                let idx = 0;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = await gen.next(nr);
                                if (r.done) return r.value;
                                const v = await f.call(thisArg, r.value, idx++);
                                try {
                                    nr = yield v;
                                } catch (e) {
                                    await gen.throw(e);
                                }
                            }
                        } finally {
                            const x = await gen.return(self.returning);
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
        if (isAsyncGenable<T>(thisArg)) return map(undefined, thisArg);
        return (gen: AsyncGenable<T>, genThisArg?: any) => map(genThisArg ?? thisArg, gen);
    }

    /**
     * Return a function that filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, Async>): GenOpValue<Async, T, [any?], Enhanced<T, Async>>;

    /**
     * Return a function that filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, Async>, thisArg: any): GenOpValue<Async, T, [], Enhanced<T, Async>>;

    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, Async>, iter: Genable<T, Async>): Enhanced<T, Async>;
    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, Async>, thisArg: any, iter: Genable<T, Async>): Enhanced<T, Async>;

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
    filter<T>(f: IndexedPredicate<T, Async>, thisArg?: any | Genable<T, Async>, iter?: Genable<T, Async>):
        Enhanced<T, Async>
        | GenOpValue<Async, T, [], Enhanced<T, Async>>
        | GenOpValue<Async, T, [any?], Enhanced<T, Async>>
    {
        const filter = (thisArg: any, iter: Genable<T, Async>) => {
            const gen = toAsyncGenerator(iter);
            let self: EnhancedAsyncGenerator<T, Async>;
            async function* filter<V>(f: IndexedPredicate<T, Async>): AsyncGenerator<T> {
                let nr: any = undefined;
                let idx = 0;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = await gen.next(nr);
                                if (r.done) return r.value;
                                if (await f.call(thisArg, r.value, idx++)) {
                                    try {
                                        nr = yield r.value;
                                    } catch (e) {
                                        await gen.throw(e);
                                    }
                                }
                            }
                        } finally {
                            const x = await gen.return?.(self.returning);
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
        if (isAsyncGenable<T>(thisArg)) return filter(undefined, thisArg);
        return (gen: Genable<T, Async>, genThisArg?: any) => filter(genThisArg ?? thisArg, gen);
    }


    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     */
    flat<T, D extends number = 1>(depth: D): <X>(gen: Genable<X>) => Enhanced<Async, FlatGen<X, D>>;
    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     * @param gen
     */
    flat<T, D extends number = 1>(depth: D, gen: Genable<T>): Enhanced<Async, FlatGen<T, D>>;
    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param gen
     * @param depth default = 1
     */
    flat<T, D extends number = 1>(gen: Genable<T>, depth?: D): Enhanced<Async, FlatGen<T, D>>;
    flat<T, D extends number = 1>(depth: D|Genable<T>, gen?: Genable<T> | D):
        Enhanced<Async, FlatGen<T, D>>
        | (<X>(gen: Genable<X>) => Enhanced<Async, FlatGen<X, D>>)
    {
        const flat = <X>(depth: D, gen: Genable<X, Async>) => {
            let self: Enhanced<Async, FlatGen<X, D>>;
            const gens = new Set<AsyncGenerator>();
            if (isAsyncGenerator(gen)) gens.add(gen);

            async function* flat<D extends number>(it: AsyncIterator<unknown>, depth: D): AsyncGenerator<FlatGen<X, D>> {
                let nr: any = undefined;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = await it.next(nr);
                                if (r.done) return r.value;
                                const v: any = r.value;
                                if (isAsyncGenerator(v)) {
                                    gens.add(v);
                                }
                                try {
                                    if (depth > 0 && isAsyncIterator(v)) {
                                        yield* flat(v, depth - 1);
                                    } else if (depth > 0 && (isAsyncIterable(v) || isIterable(v))) {
                                        yield* flat(toAsyncIterator(v), depth - 1)
                                    } else {
                                        nr = yield r.value as FlatGen<T, D>;
                                    }
                                } catch (e) {
                                    await it.throw?.(e);
                                }
                            }
                        } finally {
                            const x = await it.return?.(self.returning);
                            if (isAsyncGenerator(it)) gens.delete(it);
                            // If the wrapped generator aborted the return, we will, too.
                            if (x && !x.done) {
                                // noinspection ContinueOrBreakFromFinallyBlockJS
                                break;
                            }
                            for (const g of gens) {
                                await g.return(self.returning);
                            }
                        }
                    }
                }
            }

            return self = this.enhance(flat(toAsyncIterator(gen), depth));
        }
        if (typeof depth === 'number') {
            if (gen) {
                if (isAsyncGenable(gen)) {
                    return flat(depth, gen);
                } else {
                    throw new TypeError(`Invalid Genable: ${gen}`);
                }
            }
            return <X>(gen: Genable<X, Async>) => flat(depth, gen);
        } else if (isAsyncGenable(depth)) {
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
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, Async>, depth: D): (gen: Genable<T, Async>) => Enhanced<FlatGen<R, D>, Async>;

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a function that accepts a generator, and returns another generator that yields the individual value
     * at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     */
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, Async>): (gen: Genable<T, Async>, depth?: D) => Enhanced<FlatGen<R, D>, Async>;
    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a generator that yields the individual values at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param gen
     */
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, Async>, gen: Genable<T, Async>): Enhanced<FlatGen<R, D>, Async>;
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
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, Async>, depth: D, gen: Genable<T, Async>): Enhanced<FlatGen<R, D>, Async>;
    flatMap<T, D extends number, R = FlatGen<T, D>>(f: IndexedFn<T, R, Async>, depthOrGen?: D | Genable<T, Async>, gen?: Genable<T, Async>):
        Enhanced<FlatGen<R, D>, Async>
        | (<X, Y = FlatGen<T, D>>(gen: Genable<X, Async>) => Enhanced<Y, Async>)
        | (<X, Y = FlatGen<T, D>>(gen: Genable<X, Async>, depth?: D) => Enhanced<Y, Async>)
    {
        const flatMap = <X>(depth: D, gen: Genable<X, Async>) => {
            let self: Enhanced<FlatGen<X, D>, Async>;
            let idx = 0;

            async function* flatMap<D extends number>(it: AsyncIterator<unknown>, depth: D): AsyncGenerator<FlatGen<X, D>, undefined, unknown | undefined> {
                let nr: any = undefined;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = await it.next(nr as undefined);
                                if (r.done) return r.value;
                                const v = f(r.value as FlatGen<T, D>, idx++);
                                try {
                                    if (isAsyncIterator(v)) {
                                        if (depth > 1) {
                                            yield* flatMap(v, depth - 1);
                                        } else if (depth === 1) {
                                            yield* toAsyncGenerator(v);
                                        } else {
                                            yield v;
                                        }
                                    } else if (isAsyncIterable(v) || isIterable(v)) {
                                        if (depth > 1) {
                                            yield* flatMap(toAsyncIterator(v), depth - 1);
                                        } else if (depth === 1) {
                                            yield* toAsyncGenerator(v);
                                        } else {
                                            yield v;
                                        }
                                    } else {
                                        nr = yield v;
                                    }
                                } catch (e) {
                                    await it.throw?.(e);
                                }
                            }
                        } finally {
                            const x = await it.return?.(self.returning);
                            // If the wrapped generator aborted the return, we will, too.
                            if (x && !x.done) {
                                // noinspection ContinueOrBreakFromFinallyBlockJS
                                break;
                            }
                        }
                    }
                }
            }

            return self = this.enhance(flatMap(toAsyncIterator(gen), depth));
        }

        if (isAsyncGenable(gen)) {
            return flatMap(depthOrGen as D ?? 1 as D, gen);
        } else if (isAsyncGenable( depthOrGen)) {
            return flatMap(1 as D, depthOrGen);
        }
        return <X>(gen: Genable<X, Async>, depth?: D) => flatMap(depthOrGen ?? depth ?? 1 as D, gen);
    }

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     */
    slice<T>(start: number, end: number): <X>(iter: Genable<X, Async>) => Enhanced<X, Async>;
    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     * @param iter
     */
    slice<T>(start: number, end: number, iter: Genable<T, Async>): Enhanced<T, Async>;
    slice<T>(start: number, end: number, iter?: Genable<T, Async>):
        Enhanced<T, Async>
        | (<X>(gen: Genable<X, Async>) => Enhanced<X, Async>)
    {
        const slice = <X>(iter: Genable<X, Async>) => {
            const it = toAsyncIterator(iter);
            async function* slice(start: number, end: number) {
                for (let i = 0; i < start; i++) {
                    const r = await it.next();
                    if (r.done) return r.value;
                }
                if (end === Number.POSITIVE_INFINITY) {
                    yield* toAsyncIterable(it);
                } else {
                    let nv: any = undefined;
                    while (true) {
                        try {
                            for (let i = start; i < end; i++) {
                                const r = await it.next(nv);
                                if (r.done) return r.value;
                                try {
                                    nv = yield r.value;
                                } catch (e) {
                                    const re = await it.throw?.(e);
                                    if (re) {
                                        if (re.done) return re.value;
                                        nv = yield re.value;
                                    }
                                }
                            }
                        } finally {
                            const x = await it.return?.(null);
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
    concat<T extends Genable<any, Async>[]>(...gens: T): Enhanced<GenUnion<T>, Async> {
        let self: Enhanced<GenUnion<T>, Async>;
        async function* concat() {
            let i = 0;
            try {
                for (; i < gens.length; i++) {
                    yield* toAsyncIterable(gens[i]);
                }
            } finally {
                // Terminate any remaining generators.
                for (; i < gens.length; i++) {
                    const g = gens[i];
                    if (isAsyncGenerator(g)) {
                        await g.return(self.returning);
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
    reduce<A, T>(f: Reducer<A, T, T>, gen: Genable<T, Async>): A;
    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * **Array.prototype.reduce**. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T>(f: Reducer<A, T, T, Async>): (gen: Genable<T, Async>) => A;
    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T>(f: Reducer<A, T, A, Async>): (init: A, gen: Genable<T, Async>) => A;
    /**
     * Reduces **gen** like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     * @param f
     * @param init
     * @param gen
     */
    reduce<A, T>(f: Reducer<A, T, A, Async>, init: A, gen: Genable<T, Async>): A;
    /**
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * Alternatively, the init value can be supplied along with the generator as a second argument.
     * @param f
     * @param init
     */
    reduce<A, T>(f: Reducer<A, T, A, Async>, init: A): (gen: Genable<T, Async>) => A;
    reduce<A, T>(
        f: Reducer<A, T, A | T, Async>,
        initOrGen?: A | Genable<T, Async>,
        gen?: Genable<T, Async>
    ): A
        | Promise<A>
        | ((gen: Genable<T, Async>) => A | Promise<A>)
        | ((f: (acc: A, v: T) => A, init: A) => A | Promise<A>)
        | ((f: (acc: A | T, v: T) => A) => A | Promise<A>)
    {

        const reduce = async (init: A | PromiseLike<A> | undefined, it: AsyncIterator<T>): Promise<A> => {
            let acc: A | T | undefined = await init;
            if (acc === undefined) {
                const r = await it.next();
                if (r.done) throw new TypeError(`No initial value in reduce`);
                acc = r.value;
            }
            while (true) {
                const r = await it.next();
                if (r.done) return acc as A;
                acc = await f(acc, r.value);
            }
        };
        if (isAsyncGenable(gen)) {
            return reduce(initOrGen as A, toAsyncIterator(gen));
        } else if (isAsyncGenable(initOrGen)) {
            return reduce(undefined, toAsyncIterator(initOrGen));
        }
        return (gen: Genable<T, Async>, init?: A) => reduce(init ?? initOrGen, toAsyncIterator(gen));
    }

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    some<T>(p: IndexedPredicate<T, Async>, thisArg?: any): (gen: Genable<T, Async>) => ReturnValue<boolean, Async>;
    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     */
    some<T>(p: IndexedPredicate<T, Async>): (gen: Genable<T, Async>, thisArg?: any) => ReturnValue<boolean, Async>;
    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    some<T>(p: IndexedPredicate<T, Async>, gen: Genable<T, Async>): ReturnValue<boolean, Async>;
    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    some<T>(p: IndexedPredicate<T, Async>, thisArg: any, gen: Genable<T, Async>): ReturnValue<boolean, Async>;
    some<T>(
        pred: IndexedPredicate<T, Async>,
        thisOrGen?: any | Genable<T, Async>,
        gen?: Genable<T, Async>
    ): ReturnValue<boolean, Async> | ((gen: Genable<T, Async>) => ReturnValue<boolean, Async>)
    {
        const some = async (thisArg: any, it: AsyncIterator<T>): Promise<boolean> => {
            let i = 0;
            while (true) {
                const r = await it.next();
                if (r.done) return false;
                if (pred.call(thisArg, r.value, i++)) return true;
            }
        };
        if (isAsyncGenable(gen)) {
            return some(thisOrGen, toAsyncIterator(gen));
        } else if (isAsyncGenable(gen)) {
            return (gen: Genable<T, Async>, thisArg?: any) =>
                some(thisArg ?? thisOrGen, toAsyncIterator(gen));
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
    every<T>(p: IndexedPredicate<T, Async>, thisArg?: any): (gen: Genable<T, Async>) => ReturnValue<boolean, Async>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     */
    every<T>(p: IndexedPredicate<T, Async>): (gen: Genable<T, Async>, thisArg?: any) => ReturnValue<boolean, Async>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    every<T>(p: IndexedPredicate<T, Async>, gen: Genable<T, Async>): ReturnValue<boolean, Async>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    every<T>(p: IndexedPredicate<T, Async>, thisArg: any, gen: Genable<T, Async>): ReturnValue<boolean, Async>;
    every<T>(
        pred: IndexedPredicate<T, Async>,
        genOrThis?: any | Genable<T, Async>,
        gen?: Genable<T, Async>
    ): ReturnValue<boolean, Async> | ((gen: Genable<T, Async>) => ReturnValue<boolean, Async>)
    {
        const every = async (thisArg: any, it: AsyncIterator<T>): Promise<boolean> => {
            let i = 0;
            while (true) {
                const r = await it.next();
                if (r.done) return true;
                if (!pred.call(thisArg, r.value, i++)) return false;
            }
        };
        if (isAsyncGenable(gen)) {
            return every(genOrThis, toAsyncIterator(gen));
        } else if (isGenable(gen)) {
            return (gen: Genable<T, Async>, thisArg?: any) =>
                every(thisArg ?? genOrThis, toAsyncIterator(gen));
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
    repeatLast<T>(gen: Genable<T, Async>, max: number = Number.POSITIVE_INFINITY): Enhanced<T | undefined, Async> {
        const it = toAsyncIterator(gen);
        let nr: any;
        let self: EnhancedAsyncGenerator<T | undefined>;

        async function* repeatLast() {
            try {
                let last = undefined
                while (true) {
                    const r = await it.next(nr)
                    if (r.done) break;
                    try {
                        nr = yield last = r.value;
                    } catch (e) {
                        const re = await it.throw?.(e);
                        if (re) {
                            if (re.done) break;
                            yield last = re.value;
                        }
                    }
                }
                for (let i = 0; i < max; i++) {
                    // Important to await at the expected point for consistent behavior.
                    yield await last;
                }
            } finally {
                await it.return?.(self.returning);
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
    repeat<T>(value: T, repetitions: number = Number.POSITIVE_INFINITY): Enhanced<T, Async> {
        async function* repeat() {
            for (let i = 0; i < repetitions; i++) {
                // Important to await at the expected point for consistent behavior.
                yield await value;
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
    zip<G extends (Genable<any, Async>)[]>(...gens: G) {
        if (gens.length === 0) return this.enhance([]);
        const its = gens.map(toAsyncIterator);
        let done = false;
        let self: Enhanced<UnwrapGen<Async, G>, Async>;

        async function* zip2(): AsyncGenerator<UnwrapGen<Async, G>> {
            try {
                while (true) {
                    let result: UnwrapGen<Async, G> = [] as unknown as UnwrapGen<Async, G>;
                    for (const g of its) {
                        const r = await g.next();
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
                                await (g as any).throw?.(e);
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
                            await (g as any).return?.(self.returning);
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
    join(sep: string): <T>(gen: Genable<T, Async>) => ReturnValue<string, Async>;

    /**
     * Joins the elements produced by a [[Genable]], analogous to `Array.prototype.join`.
     * @param gen
     * @param sep
     */
    join<T>(gen: Genable<T, Async>, sep?: string): ReturnValue<string, Async>;
    join<T>(genOrSeparator: Genable<T, Async>|string, sep?: string):
        ReturnValue<string, Async> | (<X>(gen: Genable<X, Async>) => ReturnValue<string, Async>)
    {
        if (typeof genOrSeparator === 'string') {
            sep = genOrSeparator;
            return <X>(gen: Genable<X, Async>) => this.join(gen, sep);
        }
        return Promise.resolve(this.enhance(genOrSeparator).asArray()).then (a => a.join(sep));
    }

    /**
     * Enhance an existing generator (or iterator or iterable) to be a EnhancedGenerator.
     * @param gen
     */
    enhance<T, R = any, N = undefined>(gen: AsyncGenable<T>): EnhancedAsyncGenerator<T, R, N> {
        const gen2 = toAsyncGenerator(gen) as Partial<EnhancedAsyncGenerator<T, R, N>>;
        const old = Object.getPrototypeOf(gen2);
        const proto = Object.assign(Object.create(EnhancedAsyncGenerator.prototype), old);
        proto.return = (v: any) => (gen2.returning = v, old.return.call(gen2, v));
        Object.setPrototypeOf(gen2, proto);
        return gen2 as EnhancedAsyncGenerator<T, R, N>;
    }
}

/**
 * Factory for synchronous generator operators. See [[GeneratorOps]] for details.
 */
const Async: GeneratorOps<Async> = new Async_();
export {Async};

export abstract class EnhancedAsyncGenerator<T = unknown, TReturn = any, TNext = unknown>
    extends Enhancements<T, TReturn, TNext, Async>
    implements AsyncGenerator<T, TReturn, TNext>, AsyncIterable<T>, AsyncIterator<T> {

    abstract [Symbol.asyncIterator](): EnhancedAsyncGenerator<T>;
}

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
async function* AsyncFoo() {
}

/**
 * @internal
 */
export const AsyncGenProto = Object.getPrototypeOf(AsyncFoo());

// Make EnhancedGenerator inherit generator methods.

Object.setPrototypeOf(EnhancedAsyncGenerator.prototype, makeProto(AsyncGenProto));
Object.defineProperty(EnhancedAsyncGenerator.prototype, '_impl', {
    value: Async,
    writable: false,
    enumerable: false,
    configurable: false
});
