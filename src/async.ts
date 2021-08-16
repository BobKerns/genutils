/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/retirement-simulator
 */

/**
 * {@link Async} namespace.
 *
 * @module Async
 */

import { EnhancedAsyncGenerator, impl } from "./async-impl";
import { Enhancements } from "./enhancements";
import { IEnhancements } from "./ienhancement";


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
const AsyncGenProto = Object.getPrototypeOf(AsyncFoo());

// Make EnhancedGenerator inherit generator methods.

Object.setPrototypeOf(EnhancedAsyncGenerator.prototype, makeProto(AsyncGenProto));
Object.defineProperty(EnhancedAsyncGenerator.prototype, '_impl', {
    value: impl,
    writable: false,
    enumerable: false,
    configurable: false
});

import { Constructor as BareConstructor, ConstructorType } from "./types";

import { Async as AsyncMixin } from './async-mixin';
import { Async as AsyncWrap } from './async-wrap';

/**
 * Namespace for the asynchronous version of the generic generator operators.
 */
export namespace Async {
    /**
     * Literal type indicating an asynchronous generator. Only a type, not a value.
     */
    export type type = 'async';
    /**
     * See [[Enhancements.asArray]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const asArray = impl.asArray.bind(impl);
    /**
     * Return a generator concatenating this with the supplied generator(s).
     *
     * See [[Enhancements.concat]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const concat = impl.concat.bind(impl);
    /**
     * See [[Enhancements.every]]
     */
    export const every = impl.every.bind(impl);
    /**
     * See [[Enhancements.filter]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const filter = impl.filter.bind(impl);
    /**
     * See [[Enhancements.flat]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const flat = impl.flat.bind(impl);
    /**
     * See [[Enhancements.flatMap]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const flatMap = impl.flatMap.bind(impl);
    /**
     * See [[Enhancements.forEach]]
     */
    export const forEach = impl.forEach.bind(impl);
    /**
     * See [[Enhancements.join]]
     */
    export const join = impl.join.bind(impl);
    /**
     * See [[Enhancements.limit]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const limit = impl.limit.bind(impl);
    /**
     * See [[Enhancements.map]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const map = impl.map.bind(impl);
    export const merge = impl.merge.bind(impl);
    /**
     * Create an [[Async.Generator]] which yields the supplied values.
     * @return **Returns:** [[Async.Generator]]
     */
    export const of = impl.of.bind(impl);
    /**
     * See [[Enhancements.reduce]]
     */
    export const reduce = impl.reduce.bind(impl);
    /**
     * See [[Enhancements.repeat]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const repeat = impl.repeat.bind(impl);
    /**
     * See [[Enhancements.repeatLast]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const repeatLast = impl.repeatLast.bind(impl);
    /**
     * See [[Enhancements.slice]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const slice = impl.slice.bind(impl);
    /**
     * See [[Enhancements.some]]
     */
    export const some = impl.some.bind(impl);
    /**
     * See [[Enhancements.sort]]
     */
    export const sort = impl.sort.bind(impl);
    /**
     * See [[Enhancements.zip]]
     * @return **Returns:** [[Async.Generator]]
     */
    export const zip = impl.zip.bind(impl);

    /**
     * Convert any `AsyncIterator` or `AsyncIterable` to a [[Async.Generator]].
     * @return **Returns:** [[Async.Generator]]
     */
    export const enhance = impl.enhance.bind(impl);


    /**
     * An enhanced generator that can be used in various ways.
     *
     * Most methods come both as instance (prototype) methods and as static methods. They
     * provide equivalent functionality, but the static methods allow use on `Iterator` and
     * `Iterable` objects without first converting to a generator.
     *
     * The {@link Async.enhance} method will add additional instance methods to
     * an ordinary generator's prototype (a new prototype, **not** modifying any global prototype!).
     * It can also be used to convert `Iterator` and `Iterable` objects to [[Generator]].
     *
     * For methods which return an [[Async.Generator]], care is take to propagate any `Generator.throw`
     * and `Generator.return` calls to any supplied generators, so they can properly terminate.
     *
     * The exceptions are [[Enhancements.flat]] (and by extension, [[Enhancements.flatMap]]), which cannot know what nested generators
     * they might encounter in the future. Any generators encountered so far will be terminated, however.
     *
     * @typeParam T the type of values returned in the iteration result.
     * @typeParam TReturn the type of values returned in the iteration result when the generator terminates
     * @typeParam TNext the type of value which can be passed to `.next(val)`.
     *
     * See also {@link Sync.Generator}
     */
    export type Generator<T,TReturn, TNext> = EnhancedAsyncGenerator<T, TReturn, TNext>;

    export type Constructor<T, TReturn, TNext, Base extends BareConstructor<AsyncIterable<T>>> =
        ConstructorType<Base> & IEnhancements<T, TReturn, TNext, Async.type>;

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
     * class MyEnhancedAsyncIterable extends Async.Mixin(MyAsyncIterable) {
     *     constructor() {
     *         super();
     *     }
     * }
     * const foo = new MyEnhancedAsyncIterable();
     * await foo.map(i => i * 2).asArray(); // => [2, 4, 6]
     * await foo.map(i => i + 2).asArray(); // => [3, 4, 5]
     * ```
     * @param Base a constructor for a class that implements `AsyncIterable`.
     * @returns a new constructor for an enhanced class.
     */
    export const Mixin = AsyncMixin.Mixin;

    /**
     * Turn a function that returns an `AsyncIterator<T>` into an `AsyncIterable<T>` object which can be repeatedly
     * iterated over, invoking the function each time to produce a new `AsyncIterator<T>`.
     * @param fn A function that returns an `AsyncIterator<T>`
     * @param args Arguments to be passed to the function
     * @returns
     */
    export const wrap = AsyncWrap.wrap;
};
