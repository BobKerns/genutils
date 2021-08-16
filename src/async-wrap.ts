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
 * @module Async.wrap
 */


import { toAsyncGenerator } from "./functions";
import type { Async as A } from './async';
import { impl } from './async-impl';
import { Async as AsyncMixin } from './async-mixin';
import { IEnhancements } from "./ienhancement";

type AsyncIteratorFn<T, PARAMS extends any[] = []> = (...args: PARAMS) => AsyncIterator<T>;

class AsyncFunctionWrapperBase<T, PARAMS extends any[] = []> implements AsyncIterable<T> {
    #fn: AsyncIteratorFn<T, []>;
    constructor(fn: AsyncIteratorFn<T, PARAMS>, args: PARAMS) {
        this.#fn = (fn as AsyncIteratorFn<T, any[]>).bind(this, ...args);
    }
    [Symbol.asyncIterator](): A.Generator<T, any, undefined> {
       return impl.enhance(toAsyncGenerator(this.#fn()));
    }
}

class AsyncFunctionWrapper<T, PARAMS extends any[] = []> extends AsyncMixin.Mixin(AsyncFunctionWrapperBase) {
    constructor(fn: AsyncIteratorFn<T, PARAMS>, args: PARAMS) {
        super(fn, args);
    }
}

export namespace Async {
    /**
     * Turn a function that returns an `AsyncIterator<T>` into an `AsyncIterable<T>` object which can be repeatedly
     * iterated over, invoking the function each time to produce a new `AsyncIterator<T>`.
     * @param fn A function that returns an `AsyncIterator<T>`
     * @param args Arguments to be passed to the function
     * @returns
     */
    export const wrap = <T, PARAMS extends any[]>(fn: AsyncIteratorFn<T, PARAMS>, ...args: PARAMS) =>
        new AsyncFunctionWrapper<T, PARAMS>(fn, args) as AsyncIterable<T> & IEnhancements<T, any, undefined, 'async'>;
}