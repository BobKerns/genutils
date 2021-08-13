/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/retirement-simulator
 */

/**
 * Mixin for synchronous iterables.
 *
 * @module
 */

import { IEnhancements } from "./ienhancement";
import { Sync } from "./sync";
import { Constructor, Enhanced, Genable, IndexedFn, IndexedPredicate, Reducer, ReturnValue, SyncEnhancedConstructor, SyncType } from "./types";

/**
 * Given a class that implements `Iterable<T, TReturn, TNext>`, this returns a class that implements {@link IEnhancements}, allowing one to treat it as if
 * it were an array, in supporting methods such as {@link IEnhancements.map|.map()} and {@link IEnhancements.filter|.filter()}.
 *
 * Usage:
 *
 * ```typescript
 * class MySyncIterable implements Iterable<number> {
 *   *[Symbol.iterator]() {
 *      yield 1;
 *      yield 2;
 *      yield 3;
 *   }
 * }
 *
 * const MyEnhancedSyncIterable = SyncMixin(MySyncIterable);
 * const foo = new MyEnhancedSyncIterable();
 * foo.map(i => i * 2).toArray(); => [2, 4, 6]
 * foo.map(i => i + 2).toArray(); => [3, 4, 5]
 * ```
 * @param Base a constructor for a class that implements `Iterable`.
 * @returns a new constructor for an enhanced class.
 */
export function SyncMixin<T, TReturn, TNext>(Base: Constructor<Iterable<T>>): new (...args: any[]) => SyncEnhancedConstructor<T, TReturn, TNext, typeof Base> {
    class SyncMixin extends Base implements IEnhancements<T, TReturn, TNext, 'sync'> {
        #tag?: string = undefined;
        constructor(...args: any[]) {
            super(...args);
        }
        #iter() {
            return Sync.enhance(this[Symbol.iterator]() as Iterator<T, TReturn, TNext>);
        }
        asArray(): ReturnValue<T[], 'sync'> {
            return this.#iter().asArray();
        }
        limit(max: number): Enhanced<T, 'sync', TReturn, TNext> {
            return this.#iter().limit(max);
        }
        forEach(f: IndexedFn<T, void, 'sync'>, thisArg?: any): void {
            return this.#iter().forEach(f, thisArg);
        }
        map<V>(f: IndexedFn<T, V, 'sync'>, thisArg?: any): Enhanced<V, 'sync', TReturn, TNext> {
            return this.#iter().map(f, thisArg);
        }
        filter(f: IndexedPredicate<T, 'sync'>, thisArg?: any): Enhanced<T, 'sync', TReturn, TNext> {
            return this.#iter().filter(f, thisArg);
        }
        flat<D extends number = 1>(depth: D = 1 as D) {
            return this.#iter().flat(depth);
        }
        flatMap<D extends number = 1>(f: IndexedFn<T, any, 'sync'>, depth: D = 1 as D) {
            return this.#iter().flatMap(f, depth);
        }
        slice(start: number = 0, end: number = Number.MAX_SAFE_INTEGER): Enhanced<T, 'sync', TReturn | undefined, TNext> {
            return this.#iter().slice(start, end);
        }
        concat<T, TReturn, TNext>(...gens: Genable<T, 'sync', TReturn, TNext>[]): Enhanced<T, 'sync', void | TReturn, TNext> {
            return this.#iter().concat(...gens);
        }
        reduce<A, T, TReturn, TNext>(f: Reducer<A, T, T, 'sync'>): ReturnValue<A, 'sync'>;
        reduce<A, T, TReturn = T, TNext = T>(f: Reducer<A, T, A, 'sync'>, init: A): ReturnValue<A, 'sync'>;
        reduce<A>(f: Reducer<A, T, A, 'sync'>, init?: A): ReturnValue<A, 'sync'>;
        reduce<A>(f: any, init?: any): ReturnValue<A, 'sync'> | ReturnValue<A, 'sync'> | ReturnValue<A, 'sync'> {
            return this.#iter().reduce(f, init);
        }
        some<T>(p: IndexedPredicate<T, 'sync'>, thisArg?: any): ReturnValue<boolean, 'sync'> {
            return this.#iter().some(p, thisArg);
        }
        every(p: IndexedPredicate<T, 'sync'>, thisArg?: any): ReturnValue<boolean, 'sync'> {
            return this.#iter().every(p, thisArg);
        }
        repeatLast(max: number = Number.MAX_SAFE_INTEGER): Enhanced<T, 'sync', void | TReturn, TNext> {
            return this.#iter().repeatLast(max);
        }
        repeat<N>(value: N, repetitions: number = Number.MAX_SAFE_INTEGER): Enhanced<T | N, 'sync', void, TNext> {
            return this.#iter().repeat(value, repetitions);
        }
        join(sep: string = ''): ReturnValue<string, 'sync'> {
            return this.#iter().join(sep);
        }
        sort(cmp?: (a: T, b: T) => number): ReturnValue<T[], 'sync'> {
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
    return SyncMixin;
}