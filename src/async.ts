/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */
/**
 * This entry point loads asynchronous extended generators
 * @packageDocumentation
 * @module async
 * @preferred
 */

import type {
    Enhanced, FlatGen, Genable, GeneratorOps, GenOp, GenOpValue, IndexedFn, IndexedPredicate, Reducer, ReturnValue, UnwrapArray
    } from "./types";
// Should be 'import type' but that makes TS insist it can't be a value here even after defining it.
import {Async} from './types';
import {
    isAsyncGenable, isAsyncGenerator, isAsyncIterable, isAsyncIterator, isGenable, isIterable,
    toAsyncGenerator, toAsyncIterable, toAsyncIterator
} from "./functions";
import {Enhancements} from "./enhancements";

/**
 * Asynchronous implementation of enhanced generators
 */


class Async_ implements GeneratorOps<Async> {
    /**
     * Return a generator that yields the supplied values.
     * @param values
     */
    of<T extends any[], TReturn, TNext>(...values: T):
        Enhanced<UnwrapArray<T>, Async, TReturn, TNext>
    {
        return this.enhance(values);
    }

    async asArray<T, TReturn, TNext>(gen: Genable<T, Async, TReturn, TNext>):
        Promise<T[]>
    {
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

    limit<T, TReturn, TNext>(max: number, gen: Genable<T, Async, TReturn, TNext>):
        Enhanced<T, Async, TReturn, TNext>;

    limit(max: number):
        GenOp<Async>;

    limit<T, TReturn, TNext>(
        max: number,
        gen?: Genable<T, Async, TReturn, TNext>
    ):
         Enhanced<T, Async, TReturn, TNext>
         | GenOp<Async>
    {
        let self: EnhancedAsyncGenerator<T, TReturn, TNext>;
        async function *limit<X, XReturn = X, XNext = X>(gen: AsyncIterator<X, XReturn, XNext>) {
            let nr: XNext;
            let limited: boolean = false;
            try {
                for (let i = 0; i < max; i++) {
                    const r: any = await gen.next(nr!);
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
                    await gen.return?.(self?.returning);
                    // Even if the supplied generator refuses to terminate, we terminate.
                }
            }
        }
        if (gen) {
            return self = this.enhance(limit(toAsyncIterator(gen)));
        }
        return <X, XReturn = X, XNext = X>(gen: Genable<X, Async, XReturn, XNext>) =>
            this.enhance<X, XReturn, XNext>(limit(toAsyncIterator(gen)));
    }

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     * @param gen the generator.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T, TReturn, TNext>(f: IndexedFn<T, undefined, Async>, thisArg: any, gen: Genable<T, Async, TReturn, TNext>):
        Promise<undefined>;

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param gen the generator.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T, TReturn, TNext>(f: IndexedFn<T, undefined, Async>, gen: Genable<T, Async, TReturn, TNext>):
        Promise<undefined>;

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @param thisArg Optional value to be supplied as context `this` for function _f_.
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T, undefined, Async>, thisArg?: any):
        <TReturn, TNext>(gen: Genable<T, Async, TReturn, TNext>) =>
            Promise<undefined>;

    /**
     * Operate on each value produced by the generator. f is called with two values, the
     * value yielded by this generator and a sequential index.
     * @param f
     * @typeParam T the type of value produced by the generator.
     */
    forEach<T>(f: IndexedFn<T, undefined, Async>):
        <TReturn, TNext>(gen: Genable<T, Async, TReturn, TNext>, thisArg?: any) =>
            Promise<undefined>;

    forEach<T, TReturn = T, TNext = T>(
        f: IndexedFn<T, undefined, Async>,
        thisArgOrGen?: Genable<T, Async, TReturn, TNext>|any,
        gen?: Genable<T, Async, TReturn, TNext>
        ): Promise<undefined>
            | (<XReturn = TReturn, XNext = TNext>(gen: Genable<T, Async, XReturn, XNext>) =>
                                                Promise<undefined>)
    {
        const forEach = async <XReturn, XNext>(
                                f: IndexedFn<T, XReturn, Async>,
                                thisArg: any,
                                gen: Genable<T, Async, XReturn, XNext>
                            ): Promise<undefined> =>
            {
                const it = toAsyncIterator(gen);
                let idx = 0;
                while (true) {
                    const r = await it.next();
                    if (r.done) return;
                    await f.call(thisArg, r.value, idx++);
                }
            };
        if (gen) return forEach(f, thisArgOrGen, gen!);
        if (isAsyncGenable<T, TReturn, TNext>(thisArgOrGen)) return forEach(f, undefined, thisArgOrGen);
        return <XReturn = T, XNext = T>(gen: Genable<T, Async, XReturn, XNext>, thisArg?: any) =>
            forEach(f, thisArg ?? thisArgOrGen, gen);
    }

    map<T, V, TReturn, TNext>(f: IndexedFn<T, V, Async>):
            GenOpValue<Async, T, V>;

    map<T, V, TReturn, TNext>(f: IndexedFn<T, V, Async>, thisArg?: any):
            GenOpValue<Async, T, V>;

    map<T, V, TReturn, TNext>(f: IndexedFn<T, V, Async>, gen: Genable<T, Async, TReturn, TNext>):
            Enhanced<V, Async, TReturn, TNext>;

    map<T, V, TReturn, TNext>(f: IndexedFn<T, V, Async>, thisArg: any, gen: Genable<T, Async, TReturn, TNext>):
            Enhanced<V, Async, TReturn, TNext>;

    map<T, V,TReturn, TNext>(
        f: IndexedFn<T, V, Async>,
        thisArg?: any | Genable<T, Async, TReturn, TNext>,
        iter?: Genable<T, Async, TReturn, TNext>
    ):
        EnhancedAsyncGenerator<V, TReturn, TNext>
        | (<XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>) =>
                EnhancedAsyncGenerator<V, XReturn, XNext>)
        | (<XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>, thisArg?: any) =>
                EnhancedAsyncGenerator<V, XReturn, XNext>)
    {
        const map = <XReturn = T, XNext = T>(thisArg: any, iter: Genable<T, Async, XReturn, XNext>) => {
            const gen = toAsyncGenerator(iter);
            let self: EnhancedAsyncGenerator<V, XReturn, XNext>;
            async function* map(): AsyncGenerator<V, XReturn, XNext> {
                let nr: any = undefined;
                let idx = 0;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = await gen.next(nr);
                                if (r.done) return r.value;
                                const v = await f.call(thisArg, await r.value, idx++);
                                try {
                                    nr = yield v;
                                } catch (e) {
                                    await gen.throw(e);
                                }
                            }
                        } finally {
                            const x = await gen.return(self?.returning);
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
        if (isAsyncGenable<T, TReturn, TNext>(thisArg)) return map(undefined, thisArg);
        return <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>, genThisArg?: any) =>
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
    filter<T>(f: IndexedPredicate<T, Async>):
        GenOpValue<Async, T, T>;

    /**
     * Return a function that filters a [[Genable]] and yields a new [[EnhancedGenerator]]
     * that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @typeParam T the type of value.
     */
    filter<T>(f: IndexedPredicate<T, Async>, thisArg: any):
        GenOpValue<Async, T, T>;

    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T, TReturn, TNext>(f: IndexedPredicate<T, Async>, iter: Genable<T, Async, TReturn, TNext>):
        Enhanced<T, Async, TReturn, TNext>;

    /**
     * Return a new [[EnhancedGenerator]] that yields only the values that satisfy the predicate _f_.
     *
     * f receives the value and a sequential index.
     * @param f
     * @param thisArg Optional context to be passed as `this` to the predicate.
     * @param iter a [[Genable|Genable<T>]]
     * @typeParam T the type of value.
     */
    filter<T, TReturn, TNext>(f: IndexedPredicate<T, Async>, thisArg: any, iter: Genable<T, Async, TReturn, TNext>):
        Enhanced<T, Async, TReturn, TNext>;

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
        f: IndexedPredicate<T, Async>,
        thisArg?: any | Genable<T, Async, TReturn, TNext>,
        iter?: Genable<T, Async, TReturn, TNext>
    ):
        Enhanced<T, Async, TReturn, TNext>
        | GenOpValue<Async, T, T>
    {
        const filter = <XReturn, XNext>(thisArg: any, iter: Genable<T, Async, XReturn, XNext>) => {
            const gen = toAsyncGenerator<T, XReturn, XNext>(iter);
            let self: EnhancedAsyncGenerator<T, XReturn, XNext>;
            async function* filter<V>(f: IndexedPredicate<T, Async>): AsyncGenerator<T, XReturn, XNext> {
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
                            const x = await gen.return?.(self?.returning);
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
        if (isAsyncGenable<T, TReturn, TNext>(thisArg)) return filter(undefined, thisArg);
        return <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>, genThisArg?: any) =>
            filter<XReturn, XNext>(genThisArg ?? thisArg, gen);
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
        <T, TReturn, TNext>(gen: Genable<T, Async, TReturn, TNext>) =>
            Enhanced<FlatGen<T, D>, Async, TReturn, TNext>;

    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param depth
     * @param gen
     */

    flat<D extends number, T, TReturn, TNext>(depth: D, gen: Genable<T, Async, TReturn, TNext>):
        Enhanced<FlatGen<T, D>, Async, TReturn, TNext>;

    /**
     * Flatten the values yielded by the generator to level _depth_. Produces a generator that yields
     * the individual values at each level in depth-first order. Any iterable (including Array) or iterator
     * will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param gen
     * @param depth default = 1
     */
    flat<D extends number, T, TReturn, TNext>(gen: Genable<T, Async, TReturn, TNext>, depth?: D):
        Enhanced<FlatGen<T, D>, Async, TReturn, TNext>;

    flat<D extends number, T, TReturn, TNext>(depth: D|Genable<T, Async, TReturn, TNext>, gen?: Genable<T, Async, TReturn, TNext> | D):
        Enhanced<FlatGen<T, D>, Async, TReturn, TNext>
        | (<X, XReturn, XNext>(gen: Genable<X, Async, XReturn, XNext>) =>
                Enhanced<FlatGen<X, D>, Async, XReturn, XNext>)
    {
        const flat = <X, XReturn, XNext>(depth: D, gen: Genable<X, Async, XReturn, XNext>) => {
            let self: Enhanced<FlatGen<X, D>, Async, XReturn, XNext>;
            const gens = new Set<AsyncGenerator>();
            if (isAsyncGenerator(gen)) gens.add(gen);

            async function* flat<D extends number, Y, YReturn, YNext>(it: AsyncIterator<Y, YReturn, YNext>, depth: D): AsyncGenerator<FlatGen<Y, D>, YReturn, YNext> {
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
                            const x = await it.return?.(self?.returning);
                            if (isAsyncGenerator(it)) gens.delete(it);
                            // If the wrapped generator aborted the return, we will, too.
                            if (x && !x.done) {
                                // noinspection ContinueOrBreakFromFinallyBlockJS
                                break;
                            }
                            for (const g of gens) {
                                await g.return(self?.returning);
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
            return <X, XReturn, XNext>(gen: Genable<X, Async, XReturn, XNext>) =>
                flat(depth, gen);
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
    flatMap<D extends number, R extends FlatGen<T, D>, T>(f: IndexedFn<T, R, Async>, depth: D):
        <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>) =>
            Enhanced<R, Async, XReturn, XNext>;

    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a function that accepts a generator, and returns another generator that yields the individual value
     * at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     */
    flatMap<D extends number, R extends FlatGen<T, D>, T>(f: IndexedFn<T, R, Async>):
        <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>, depth?: D) =>
            Enhanced<R, Async, XReturn, XNext>;
    /**
     * Flatten the values yielded by applying the function to the values yielded by the generator to level _depth_.
     * Produces a generator that yields the individual values at each level in depth-first order. Any iterable
     * (including Array) or iterator will be traversed and its values yielded.
     *
     * The return type is currently over-broad
     * @param f
     * @param gen
     */
    flatMap<D extends number, R extends FlatGen<T, D>, T, TReturn, TNext>(
            f: IndexedFn<T, R, Async>,
            gen: Genable<T, Async, TReturn, TNext>
    ):
        Enhanced<R, Async, TReturn, TNext>;

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
    flatMap<D extends number, R extends FlatGen<T, D>, T, TReturn, TNext>(
        f: IndexedFn<T, R, Async>,
        depth: D,
        gen: Genable<T, Async, TReturn, TNext>
    ):
        Enhanced<R, Async, TReturn, TNext>;

    flatMap<D extends number, R extends FlatGen<T, D>, T, TReturn, TNext>(
        f: IndexedFn<T, R, Async>,
        depthOrGen?: D | Genable<T, Async, TReturn, TNext>,
        gen?: Genable<T, Async, TReturn, TNext>
    ):
        Enhanced<R, Async, TReturn, TNext>
        | (
            <Y extends FlatGen<T, D>, X, XReturn, XNext>(gen: Genable<X, Async, XReturn, XNext>) =>
                Enhanced<Y, Async, XReturn, XNext>
        )
        | (
            <Y extends FlatGen<T, D>, X, XReturn, XNext>(gen: Genable<X, Async, XReturn, XNext>, depth?: D) =>
                Enhanced<Y, Async, XReturn, XNext>
        )
    {
        const flatMap = <X, XReturn, XNext>(depth: D, gen: Genable<X, Async, XReturn, XNext>) => {
            let self: Enhanced<FlatGen<X, D>, Async, XReturn, XNext>;
            let idx = 0;

            async function* flatMap<D extends number, Y, YReturn, YNext>(
                    it: AsyncIterator<Y, YReturn, YNext>, depth: D
                ):
                    AsyncGenerator<FlatGen<T, D>, YReturn, YNext>
                {
                let nr: any = undefined;
                while (true) {
                    // noinspection LoopStatementThatDoesntLoopJS
                    while (true) {
                        try {
                            while (true) {
                                const r = await it.next(nr);
                                if (r.done) return r.value;
                                const v = await f(r.value as FlatGen<T, D>, idx++);
                                try {
                                    if (isAsyncIterator<unknown, YReturn, YNext>(v)) {
                                        if (depth > 1) {
                                            yield* flatMap(v, depth - 1);
                                        } else if (depth === 1) {
                                            const it = toAsyncIterator(v);
                                            yield* toAsyncGenerator(it);
                                        } else {
                                            yield v;
                                        }
                                    } else if (isAsyncIterable<unknown, YReturn, YNext>(v) || isIterable<unknown, YReturn, YNext>(v)) {
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
                            const x = await it.return?.(self?.returning);
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
        return <X, XReturn, XNext>(gen: Genable<X, Async, XReturn, XNext>, depth?: D) =>
            flatMap(depthOrGen ?? depth ?? 1 as D, gen);
    }

    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     */
    slice<T>(start: number, end: number):
        <X, XReturn, XNext>(iter: Genable<X, Async, XReturn, XNext>) =>
            Enhanced<X, Async, XReturn, XNext>;
    /**
     * Return a new [[EnhancedGenerator]] that only yields the indicated values, skipping _start_ initial values
     * and continuing until the _end_.
     * @param start
     * @param end
     * @param iter
     */
    slice<T, TReturn, TNext>(start: number, end: number, iter: Genable<T, Async, TReturn, TNext>):
        Enhanced<T, Async, TReturn, TNext>;

    slice<T, TReturn, TNext>(
        start: number,
        end: number,
        iter?: Genable<T, Async, TReturn, TNext>
    ):
        Enhanced<T, Async, TReturn | undefined, TNext>
        | (
            <X, XReturn, XNext>(gen: Genable<X, Async, XReturn, XNext>) =>
                Enhanced<X, Async, XReturn | undefined, XNext>
        )
    {
        const slice = <X, XReturn, XNext>(iter: Genable<X, Async, XReturn, XNext>):
            Enhanced<X, Async, XReturn | undefined, XNext> =>
        {
            const it = toAsyncIterator(iter);
            async function* slice(start: number, end: number) {
                for (let i = 0; i < start; i++) {
                    const r = await it.next();
                    if (r.done) return r.value;
                }
                if (end === Number.POSITIVE_INFINITY) {
                    yield* toAsyncIterable(it);
                } else {
                    let nv: XNext;
                    while (true) {
                        try {
                            for (let i = start; i < end; i++) {
                                const r = await it.next(nv!);
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
                            const x = await it.return?.();
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
    concat<T, TReturn, TNext>(...gens: Array<Genable<T, Async, TReturn, TNext>>):
        Enhanced<T, Async, TReturn | void, TNext>
    {
        let self: Enhanced<T, Async, TReturn | void, TNext>;
        async function* concat(): AsyncGenerator<T, TReturn | void, TNext> {
            let i = 0;
            try {
                for (; i < gens.length; i++) {
                    const it = toAsyncIterable(gens[i]);
                    yield* it;
                }
            } finally {
                // Terminate any remaining generators.
                for (; i < gens.length; i++) {
                    const g = gens[i];
                    if (isAsyncGenerator(g)) {
                        await g.return(self?.returning);
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
    reduce<A, T, TReturn, TNext>(f: Reducer<A, T, T, Async>, gen: Genable<T, Async, TReturn, TNext>):
        A;

    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * **Array.prototype.reduce**. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T>(f: Reducer<A, T, T, Async>):
        <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>) =>
            A;

    /**
     *
     * Returns a reducer function that, when applied to a `Generator` **gen**, reduces **gen** like
     * `Array.prototype.reduce`. The 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     *
     * @param f
     */
    reduce<A, T>(f: Reducer<A, T, A, Async>):
        <XReturn, XNext>(init: A, gen: Genable<T, Async, XReturn, XNext>) =>
            A;

    /**
     * Reduces **gen** like `Array.prototype.reduce`, but the 3rd argument to the reducing function ("array")
     * is omitted because there is no array.
     * @param f
     * @param init
     * @param gen
     */
    reduce<A, T, TReturn, TNext>(f: Reducer<A, T, A, Async>, init: A, gen: Genable<T, Async, TReturn, TNext>):
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
    reduce<A, T>(f: Reducer<A, T, A, Async>, init: A):
        <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>) =>
            A;

    reduce<A, T, TReturn, TNext>(
        f: Reducer<A, T, A | T, Async>,
        initOrGen?: A | Genable<T, Async, TReturn, TNext>,
        gen?: Genable<T, Async, TReturn, TNext>
    ): A
        | Promise<A>
        | (
            (gen: Genable<T, Async, TReturn, TNext>) =>
                A | Promise<A>
        )
        | (
            (f: (acc: A, v: T) => A, init: A) =>
                A | Promise<A>
        )
        | (
            (f: (acc: A | T, v: T) => A) =>
                A | Promise<A>
        )
    {

        const reduce = async <XReturn, XNext>(init: A | PromiseLike<A> | undefined, it: AsyncIterator<T, XReturn, XNext>):
            Promise<A> =>
        {
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
        return (gen: Genable<T, Async, TReturn, TNext>, init?: A) =>
            reduce(init ?? initOrGen, toAsyncIterator(gen));
    }

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     */
    some<T, TReturn, TNext>(p: IndexedPredicate<T, Async>, thisArg?: any):
        (gen: Genable<T, Async, TReturn, TNext>) =>
            ReturnValue<boolean, Async>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     */
    some<T>(p: IndexedPredicate<T, Async>):
        <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>, thisArg?: any) =>
            ReturnValue<boolean, Async>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    some<T, TReturn, TNext>(p: IndexedPredicate<T, Async>, gen: Genable<T, Async, TReturn, TNext>):
        ReturnValue<boolean, Async>;

    /**
     * Returns `true` and terminates the generator if the predicate is true for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having satisfied the predicate, `false` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    some<T, TReturn, TNext>(p: IndexedPredicate<T, Async>, thisArg: any, gen: Genable<T, Async, TReturn, TNext>):
        ReturnValue<boolean, Async>;

    some<T, TReturn, TNext>(
        pred: IndexedPredicate<T, Async>,
        thisOrGen?: any | Genable<T, Async, TReturn, TNext>,
        gen?: Genable<T, Async, TReturn, TNext>
    ):
        ReturnValue<boolean, Async>
        | (
            (gen: Genable<T, Async, TReturn, TNext>) =>
                ReturnValue<boolean, Async>
        )
    {
        const some = async <XReturn, XNext>(thisArg: any, it: AsyncIterator<T, XReturn, XNext>): Promise<boolean> => {
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
            return (gen: Genable<T, Async, TReturn, TNext>, thisArg?: any) =>
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
    every<T>(p: IndexedPredicate<T, Async>, thisArg?: any):
        <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>) =>
            ReturnValue<boolean, Async>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     */
    every<T>(p: IndexedPredicate<T, Async>):
        <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>, thisArg?: any) =>
            ReturnValue<boolean, Async>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param gen the generator
     */
    every<T, TReturn, TNext>(p: IndexedPredicate<T, Async>, gen: Genable<T, Async,TReturn, TNext>):
        ReturnValue<boolean, Async>;

    /**
     * Returns `false` and terminates this generator if the predicate is false for any of the generator's
     * yielded values.
     *
     * If the generator terminates without having failed the predicate, `true` is returned.
     * @param p predicate to apply to each yielded value.
     * @param thisArg Optional value to supply as context (`this`) for the predicate
     * @param gen the generator
     */
    every<T, TReturn, TNext>(p: IndexedPredicate<T, Async>, thisArg: any, gen: Genable<T, Async, TReturn, TNext>):
        ReturnValue<boolean, Async>;

    every<T, TReturn, TNext>(
        pred: IndexedPredicate<T, Async>,
        genOrThis?: any | Genable<T, Async, TReturn, TNext>,
        gen?: Genable<T, Async, TReturn, TNext>
    ):
        ReturnValue<boolean, Async>
        | (
            <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>) =>
                ReturnValue<boolean, Async>
        )
    {
        const every = async <XReturn, XNext>(thisArg: any, it: AsyncIterator<T, XReturn, XNext>):
            Promise<boolean> =>
        {
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
            return <XReturn, XNext>(gen: Genable<T, Async, XReturn, XNext>, thisArg?: any) =>
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
    repeatLast<T, TReturn, TNext>(
        gen: Genable<T, Async, TReturn, TNext>,
        max: number = Number.POSITIVE_INFINITY
    ):
        Enhanced<T, Async, TReturn | undefined, TNext>
    {
        const it = toAsyncIterator(gen);
        let nr: TNext;
        let self: Enhanced<T, Async, TReturn | undefined, TNext>;

        async function* repeatLast(): AsyncGenerator<T, TReturn | undefined, TNext> {
            try {
                let last: T;
                while (true) {
                    const r = await it.next(nr as unknown as TNext)
                    if (r.done) break;
                    try {
                        nr = yield (last = r.value);
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
                    yield await last!;
                }
            } finally {
                await it.return?.(self?.returning);
            }
            return;
        }

        return self = this.enhance(repeatLast());
    }


    /**
     * Returns a new generator that repeats the supplied value.
     *
     * @param value the value to repeat
     * @param repetitions The number repetitions; the default is infinite.
     */
    repeat<T, TNext>(value: T, repetitions: number = Number.POSITIVE_INFINITY):
        Enhanced<T, Async, void, TNext>
    {
        async function* repeat(): AsyncGenerator<T, void, TNext> {
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
    zip<T, TReturn, TNext>(...gens: Array<Genable<T, Async, TReturn, TNext>>):
        Enhanced<Array<T>, Async, TReturn, TNext>
    {
        if (gens.length === 0) return this.enhance([]);
        const its = gens.map(toAsyncIterator);
        let done = false;
        let self: Enhanced<Array<T>, Async, TReturn, TNext>;

        async function* zip2(): AsyncGenerator<Array<T>, TReturn, TNext> {
            try {
                while (true) {
                    let result: Array<T> = [];
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
                            await (g as any).return?.(self?.returning);
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
        <T, TReturn, TNext>(gen: Genable<T, Async, TReturn, TNext>) =>
            ReturnValue<string, Async>;

    /**
     * Joins the elements produced by a [[Genable]], analogous to `Array.prototype.join`.
     * @param gen
     * @param sep
     */
    join<T, TReturn, TNext>(gen: Genable<T, Async, TReturn, TNext>, sep?: string):
        ReturnValue<string, Async>;

    join<T, TReturn, TNext>(
        genOrSeparator: Genable<T, Async, TReturn, TNext>|string,
        sep?: string
    ):
        ReturnValue<string, Async>
        | (
            <X, XReturn, XNext>(gen: Genable<X, Async, XReturn, XNext>) =>
                ReturnValue<string, Async>
        )
    {
        if (typeof genOrSeparator === 'string') {
            sep = genOrSeparator;
            return <X, XReturn, XNext>(gen: Genable<X, Async, XReturn, XNext>) =>
                this.join(gen, sep);
        }
        return Promise.resolve(this.enhance(genOrSeparator).asArray())
            .then(a => a.join(sep));
    }

    /**
     * Returns a new generator that returns values from each of the supplied sources as they are available.
     * Values will be taken as they become available from any source.
     * The yielded values will not be distinguished by which which source they are taken; for
     * that, another method will be supplied.
     *
     * Any calls to `Generator.throw()` or `Generator.return()` will be passed to all non-terminated
     * sources.
     * @param sources
     */
    merge<T, TReturn, TNext>(...sources: Array<Genable<T, Async, TReturn, TNext>>):
        Enhanced<T, Async, TReturn | void, TNext>
    {
        let self: Enhanced<T, Async, void | TReturn, TNext>;
        let done: (r: IteratorReturnResult<TReturn>) => void;
        const donePromise = new Promise<IteratorReturnResult<TReturn>>(r => (done = r));
        let activeCount = sources.length;
        let active: Array<Promise<() => (IteratorResult<T, TReturn> | null)> | Promise<IteratorReturnResult<TReturn>>>;
        const dead = new Promise<() => (IteratorResult<T, TReturn> | null)>(() => null); // Never completes
        let gens: Array<AsyncIterator<T, TReturn, TNext>> = [];
        const wrap = async (g: Genable<T, Async, TReturn, TNext>, k: number) => {
            const ag = toAsyncIterator(g);
            gens[k] = ag;
            const handle = async (val: IteratorResult<T, TReturn>): Promise<() => (IteratorResult<T, TReturn> | null)> =>
                () => {
                    if (val.done) {
                        active[k] = dead;
                        // Unless this is the last active generator, we return null to indicate
                        // to the loop to go on to the next one.
                        return --activeCount > 0
                            ? null
                            : (done(val), val);
                    } else {
                        const v = ag.next().then(handle);
                        active[k] = v;
                        return val;
                    }
                };
            return (await ag.next().then(handle));
        };
        active = [...sources.map(wrap), donePromise];
        async function* merge(): AsyncGenerator<T, TReturn | void, TNext> {
            try {
                let nv: TNext;
                while (activeCount) {
                    const race: Array<Promise<() => (IteratorResult<T, TReturn> | null)> | Promise<IteratorReturnResult<TReturn>>> = [];
                    active.forEach(a => race.push(a))
                    const result = await (await Promise.race(race));
                    if (typeof result === 'function') {
                        let r = result();
                        if (r) {
                            if (r.done) {
                                return r.value;
                            }
                            nv = (yield r.value);
                        }
                    } else if (result && result.done) {
                        return result.value;
                    }
                }
            } finally {
                if (activeCount) {
                    for (let i = 0; i < sources.length; i++) {
                        (active[i] === null ? null : gens[i])?.return?.(self?.returning);
                    }
                }
            }
        }
        return self = Async.enhance(merge());
    }

    /**
     * Returns a function that sorts the supplied sources and returns a sorted array.
     * @param cmp a comparison function
     */
    sort<T>(cmp?: ((a: T, b: T) => number)) {
        return async <TReturn, TNext>(...sources: Array<Genable<T, Async, TReturn, TNext>>) => {
            const array: T[] = await this.merge(...sources).asArray();
            return array.sort(cmp);
        };
    }

    /**
     * Enhance an existing generator (or iterator or iterable) to be a EnhancedGenerator.
     * @param gen
     */
    enhance<T, TReturn, TNext>(gen: Genable<T, Async, TReturn, TNext>):
        EnhancedAsyncGenerator<T, TReturn, TNext>
    {
        const gen2 = toAsyncGenerator(gen)as
            unknown as Partial<EnhancedAsyncGenerator<T, TReturn, TNext>>;
        const old = Object.getPrototypeOf(gen2);
        const proto = Object.assign(Object.create(EnhancedAsyncGenerator.prototype), old);
        proto.return = (v: any) => ((gen2 as any).returning = v, old.return.call(gen2, v));
        proto[Symbol.asyncIterator] = () => gen2;
        Object.setPrototypeOf(gen2, proto);
        return gen2 as EnhancedAsyncGenerator<T, TReturn, TNext>;
    }
}

/**
 * Factory for synchronous generator operators. See [[GeneratorOps]] for details.
 */
const Async: GeneratorOps<Async> = new Async_();
export {Async};

export abstract class EnhancedAsyncGenerator<T, TReturn, TNext>
    extends Enhancements<T, TReturn, TNext, Async>
    implements AsyncGenerator<T, TReturn, TNext>,
        AsyncIterable<T>,
        AsyncIterator<T, TReturn, TNext>
{
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
