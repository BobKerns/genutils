/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/retirement-simulator
 */

/**
 * A facility to wrap a function that returns an `AsyncIterator` and turn it into an enhanced `AsyncIterable` object.
 *
 * The supplied function will be called once for each iteration.
 *
 * @module Sync.wrap
 */

import { toGenerator } from "./functions";
import { IEnhancements } from "./ienhancement";
import type { Sync as S } from "./sync";
import { impl } from './sync-impl';
import { Sync as SyncMixin} from "./sync-mixin";

type IteratorFn<T, PARAMS extends any[] = []> = (...args: PARAMS) => Iterator<T>;

class SyncFunctionWrapperBase<T, PARAMS extends any[] = []> {
    #fn: IteratorFn<T, []>;
    constructor(fn: IteratorFn<T, PARAMS>, args: PARAMS) {
        this.#fn = (fn as IteratorFn<T, any[]>).bind(this, ...args);
    }
    [Symbol.iterator](): S.Generator<T, any, undefined> {
       return impl.enhance(toGenerator(this.#fn()));
    }
}

class SyncFunctionWrapper<T, PARAMS extends any[] = []> extends SyncMixin.Mixin(SyncFunctionWrapperBase) {
    constructor(fn: IteratorFn<T, PARAMS>, args: PARAMS) {
        super(fn, args);
    }
}

export namespace Sync {
    /**
     * Turn a function that returns an `Iterator<T>` into an `Iterable<T>` object which can be repeatedly
     * iterated over, invoking the function each time to produce a new `Iterator<T>`.
     * @param fn A function that returns an `Iterator<T>`
     * @param args Arguments to be passed to the function
     * @returns
     */
    export const wrap = <T, PARAMS extends any[]>(fn: IteratorFn<T, PARAMS>, ...args: PARAMS) =>
        new SyncFunctionWrapper<T, PARAMS>(fn, args) as Iterable<T> & IEnhancements<T, any, undefined, S.type>;
}
