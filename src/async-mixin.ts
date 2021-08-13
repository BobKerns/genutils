/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/retirement-simulator
 */

/**
 * Mixin for asynchronous iterables.
 *
 * @module
 */

import { IEnhancements } from "./ienhancement";
import { Async } from "./async";
import { AsyncEnhancedConstructor, Constructor, Enhanced, Genable, IndexedFn, IndexedPredicate, Reducer, ReturnValue, SyncType } from "./types";

/**
 * Given a class that implements `Iterable<T, TReturn, TNext>`, this returns a class that implements {@link IEnhancements}, allowing one to treat it as if
 * it were an array, in supporting methods such as {@link IEnhancements.map|.map()} and {@link IEnhancements.filter|.filter()}.
 *
 * Usage:
 *
 * ```typescript
 * class MyAsyncIterable implements AsyncIterable<number> {
 *   async *[Symbol.Asynciterator]() {
 *      yield 1;
 *      yield 2;
 *      yield 3;
 *   }
 * }
 *
 * const MyEnhancedAsyncIterable = AsyncMixin(MyAsyncIterable);
 * const foo = new MyEnhancedAsyncIterable();
 * await foo.map(i => i * 2).toArray(); => [2, 4, 6]
 * awaot foo.map(i => i + 2).toArray(); => [3, 4, 5]
 * ```
 * @param Base a constructor for a class that implements `AsyncIterable`.
 * @returns a new constructor for an enhanced class.
 */
export function AsyncMixin<T, TReturn, TNext>(Base: Constructor<AsyncIterable<T>>): new (...args: any[]) => AsyncEnhancedConstructor<T, TReturn, TNext, typeof Base> {
    class AsyncMixin extends Base implements IEnhancements<T, TReturn, TNext, 'async'> {
        #tag?: string = undefined;
        constructor(...args: any[]) {
            super(...args);
        }
        #iter() {
            return Async.enhance(this[Symbol.asyncIterator]() as AsyncIterator<T, TReturn, TNext>);
        }
        asArray(): ReturnValue<T[], 'async'> {
            return this.#iter().asArray();
        }
        limit(max: number): Enhanced<T, 'async', TReturn, TNext> {
            return this.#iter().limit(max);
        }
        forEach(f: IndexedFn<T, void, 'async'>, thisArg?: any): void {
            return this.#iter().forEach(f, thisArg);
        }
        map<V>(f: IndexedFn<T, V, 'async'>, thisArg?: any): Enhanced<V, 'async', TReturn, TNext> {
            return this.#iter().map(f, thisArg);
        }
        filter(f: IndexedPredicate<T, 'async'>, thisArg?: any): Enhanced<T, 'async', TReturn, TNext> {
            return this.#iter().filter(f, thisArg);
        }
        flat<D extends number = 1>(depth: D = 1 as D) {
            return this.#iter().flat(depth);
        }
        flatMap<D extends number = 1>(f: IndexedFn<T, any, 'async'>, depth: D = 1 as D) {
            return this.#iter().flatMap(f, depth);
        }
        slice(start: number = 0, end: number = Number.MAX_SAFE_INTEGER): Enhanced<T, 'async', TReturn | undefined, TNext> {
            return this.#iter().slice(start, end);
        }
        concat<T, TReturn, TNext>(...gens: Genable<T, 'async', TReturn, TNext>[]): Enhanced<T, 'async', void | TReturn, TNext> {
            return this.#iter().concat(...gens);
        }
        reduce<A, T, TReturn, TNext>(f: Reducer<A, T, T, 'async'>): ReturnValue<A, 'async'>;
        reduce<A, T, TReturn = T, TNext = T>(f: Reducer<A, T, A, 'async'>, init: A): ReturnValue<A, 'async'>;
        reduce<A>(f: Reducer<A, T, A, 'async'>, init?: A): ReturnValue<A, 'async'>;
        reduce<A>(f: any, init?: any): ReturnValue<A, 'async'> | ReturnValue<A, 'async'> | ReturnValue<A, 'async'> {
            return this.#iter().reduce(f, init);
        }
        some<T>(p: IndexedPredicate<T, 'async'>, thisArg?: any): ReturnValue<boolean, 'async'> {
            return this.#iter().some(p, thisArg);
        }
        every(p: IndexedPredicate<T, 'async'>, thisArg?: any): ReturnValue<boolean, 'async'> {
            return this.#iter().every(p, thisArg);
        }
        repeatLast(max: number = Number.MAX_SAFE_INTEGER): Enhanced<T, 'async', void | TReturn, TNext> {
            return this.#iter().repeatLast(max);
        }
        repeat<N>(value: N, repetitions: number = Number.MAX_SAFE_INTEGER): Enhanced<T | N, 'async', void, TNext> {
            return this.#iter().repeat(value, repetitions);
        }
        join(sep: string = ''): ReturnValue<string, 'async'> {
            return this.#iter().join(sep);
        }
        sort(cmp?: (a: T, b: T) => number): ReturnValue<T[], 'async'> {
            return this.#iter().sort(cmp);
        }
        /**
         * Tag instances with the type and name for easy recognition.
         * @internal
         */
        get [Symbol.toStringTag]() {
            try {
                return this.#tag
                    ?? (this.#tag = `SyncMixin(${Base.name})`);
            } catch {
                // This can happen when viewing the prototype, because #tag isn't declared
                // on the prototype. That screws up ObservableHQ's inspector, which gets an unhandled
                // failed promise and never completes if you try to expand the real instance, because
                // it died on the prototype.
                return `SyncMixin(${Base.name}).prototype`;
            }
        }

    }
    return AsyncMixin;
}