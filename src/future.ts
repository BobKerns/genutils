/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */
/**
 * A general facility for deferred computation, built atop `Promise`.
 * @module Future
 */

/**
 * A [[Future]] is a variant of a Promise that takes a function to start execution at a later point, when
 * the value is desired. It can be used to delay a computation, or to avoid it entirely if not needed.
 *
 * By default, the computation begins when the first _onfulfilled_ handler is added with {@link then}, but
 * if the _delay_ parameter is supplied as `true` an explicit call to the {@link eval} method is required.
 *
 * This can be used to delay initiating a computation until a certain elapsed time (using [[delay]]) or
 * until some event has occurred.
 */
export class Future<T> extends Promise<T> {
    #fn?: () => T;
    #delay: boolean;

    #accept?: (val: T) => void;
    #reject?: (err: Error) => void;
    #result?: T;
    #error?: Error;
    static [Symbol.toStringTag] = 'Future';
    static [Symbol.species] = Promise;

    /**
     * Construct a {@link Future}.
     *
     * The supplied _fn_ argument will be discarded once run, so any data referenced
     * by it can be freed by the GC.
     * @param fn The function performing the future calculation
     * @param delay true if the calculation should be delayed until an explicit call to `eval`.
     */
    constructor(fn: () => T, delay?: boolean) {
        let accept;
        let reject;
        super((acc: (val: T) => void, rej: (err: Error) => void) => {
            accept = acc;
            reject = rej;
        });
        this.#accept = accept;
        this.#reject = reject;
        this.#fn = fn;
        this.#delay = !!delay;
    }

    /**
     * Perform the calculation supplied on construction. Takes arguments like {@link Promise#then}. Any pending
     * handlers from `Promise.then()`, `Promise.catch()`, or `Promise.finally()` will be also be
     * handled as normal.
     *
     * {@link eval} is run synchronously if the supplied function is synchronous. The result is not wrapped in a `Promise`,
     * but will be a `Promise` if that's what the supplied function returns. The supplied handlers are _not_ run synchronously.
     * @param onfulfilled
     * @param onrejected
     * @returns
     */
    eval<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
        ):
        T
    {
        if (this.#fn) {
            try {
                this.#result = this.#fn();
                this.#accept?.(this.#result);
                return this.#result;
            } catch (e) {
                this.#error = e as Error;
                this.#reject?.(e as Error);
                throw e;
            } finally {
                this.#fn = undefined;
                this.#accept = undefined;
                this.#reject = undefined;
                if (onfulfilled || onrejected) {
                    super.then(onfulfilled, onrejected);
                }
            }
        } else if (this.#error) {
            throw this.#error;
        } else {
            return this.#result!;
        }
    }

    /**
     * This runs {@link Promise#then} normally. If the supplied future function has not been run, runs
     * that first, unless _delay_ was supplied as truthy, or unless neither _onfullfilled_ or _onrejected_
     * was supplied.
     * @param onfulfilled
     * @param onrejected
     * @returns
     */
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
        ):
        Promise<TResult1 | TResult2>
    {
        if (this.#fn && !this.#delay && (onfulfilled || onrejected)) {
            try {
                this.eval();
            } catch (e) {
                // Do nothing; will be rejected inside this.eval().
            }
        }
        if (onfulfilled || onrejected) {
            return super.then(onfulfilled, onrejected);
        } else {
            return this as any as Promise<TResult1 | TResult2>;
        }
    }
}
